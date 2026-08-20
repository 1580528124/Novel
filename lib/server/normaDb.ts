import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import {
  normalizeEmailInput,
  normalizeLoginIdInput,
  validateEmail,
  validateAgentName,
  validateCredentials
} from "@/lib/authValidation";
import { createAgentProfile, normalizeProfile, type AgentProfile } from "@/lib/agentProfile";

type NormaAccountRow = {
  account_id: string;
  login_id: string;
  email: string | null;
  email_verified_at: Date | null;
  passcode_hash: string;
  profile: AgentProfile;
  created_at: Date;
  last_login_at: Date;
};

type EmailVerificationTokenRow = {
  account_id: string;
  email: string;
  expires_at: Date;
  used_at: Date | null;
};

type PublicAccount = {
  accountId: string;
  loginId: string;
  email: string | null;
  emailVerifiedAt: string | null;
  profile: AgentProfile;
  createdAt: string;
  lastLoginAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var normaDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var normaDbReady: Promise<void> | undefined;
}

const databaseUrl = process.env.DATABASE_URL;
const bcryptCost = 12;
const emailVerificationTokenLifetimeMs = 30 * 60 * 1000;

function getPool() {
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  if (!globalThis.normaDbPool) {
    globalThis.normaDbPool = new Pool({
      connectionString: databaseUrl
    });
  }

  return globalThis.normaDbPool;
}

function hashLegacySha256Passcode(passcode: string, loginId: string) {
  return crypto
    .createHash("sha256")
    .update(`${loginId}:${passcode}:NORMA-DB-AUTH-V1`)
    .digest("hex");
}

async function hashPasscode(passcode: string) {
  return bcrypt.hash(passcode, bcryptCost);
}

async function verifyPasscode(passcode: string, loginId: string, storedHash: string) {
  if (storedHash.startsWith("$2")) {
    return {
      ok: await bcrypt.compare(passcode, storedHash),
      needsUpgrade: false
    };
  }

  return {
    ok: storedHash === hashLegacySha256Passcode(passcode, loginId),
    needsUpgrade: true
  };
}

function createEmailVerificationToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toPublicAccount(row: NormaAccountRow): PublicAccount {
  return {
    accountId: row.account_id,
    loginId: row.login_id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at?.toISOString() ?? null,
    profile: normalizeProfile(row.profile),
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at.toISOString()
  };
}

async function ensureNormaTables() {
  if (!globalThis.normaDbReady) {
    globalThis.normaDbReady = (async () => {
      await getPool().query(`
        CREATE TABLE IF NOT EXISTS norma_agent_accounts (
          account_id TEXT PRIMARY KEY,
          login_id TEXT NOT NULL UNIQUE,
          passcode_hash TEXT NOT NULL,
          profile JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      await getPool().query(`
        ALTER TABLE norma_agent_accounts
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ
      `);

      await getPool().query(`
        CREATE UNIQUE INDEX IF NOT EXISTS norma_agent_accounts_email_unique
        ON norma_agent_accounts (lower(email))
        WHERE email IS NOT NULL
      `);

      await getPool().query(`
        CREATE TABLE IF NOT EXISTS norma_email_verification_tokens (
          token_hash TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES norma_agent_accounts(account_id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      await getPool().query(`
        CREATE INDEX IF NOT EXISTS norma_email_verification_tokens_account_id_idx
        ON norma_email_verification_tokens (account_id)
      `);
    })();
  }

  await globalThis.normaDbReady;
}

export async function warmupNormaDb() {
  await ensureNormaTables();
  await getPool().query("SELECT 1");
  return { ok: true as const };
}

export async function registerDbAccount(loginId: string, passcode: string, agentName: string) {
  const emailError = validateEmail(loginId);
  if (emailError) return { ok: false as const, reason: emailError };

  const credentialError = validateCredentials(loginId, passcode);
  if (credentialError) return { ok: false as const, reason: credentialError };

  const agentNameError = validateAgentName(agentName);
  if (agentNameError) return { ok: false as const, reason: agentNameError };

  await ensureNormaTables();

  const normalizedEmail = normalizeEmailInput(loginId);
  const accountId = `ACC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const profile = createAgentProfile(agentName.trim());
  const passcodeHash = await hashPasscode(passcode);

  try {
    const result = await getPool().query<NormaAccountRow>(
      `
        INSERT INTO norma_agent_accounts (account_id, login_id, email, passcode_hash, profile)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
      `,
      [accountId, normalizedEmail, normalizedEmail, passcodeHash, JSON.stringify(profile)]
    );

    const account = toPublicAccount(result.rows[0]);
    const verification = await createDbEmailVerificationToken(account.accountId, normalizedEmail);

    return { ok: true as const, account, verification };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return { ok: false as const, reason: "该邮箱已建档，请切换至身份校验。" };
    }

    throw error;
  }
}

export async function identifyDbAccount(loginId: string, passcode: string) {
  const credentialError = validateCredentials(loginId, passcode);
  if (credentialError) return { ok: false as const, reason: credentialError };

  await ensureNormaTables();

  const normalizedLogin = normalizeLoginIdInput(loginId);
  const result = await getPool().query<NormaAccountRow>(
    `
      SELECT account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE login_id = $1 OR lower(email) = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  const account = result.rows[0];
  if (!account) return { ok: true as const, exists: false as const };
  if (account.email && !account.email_verified_at) {
    return { ok: false as const, reason: "邮箱尚未验证，请先完成验证。", requiresEmailVerification: true as const };
  }

  const passcodeCheck = await verifyPasscode(passcode, account.login_id, account.passcode_hash);
  if (!passcodeCheck.ok) {
    return { ok: false as const, reason: "通行密钥校验失败。" };
  }
  if (passcodeCheck.needsUpgrade) await updateDbPasscodeHash(account.account_id, await hashPasscode(passcode));

  const updated = await touchDbAccount(account.account_id);
  return updated
    ? { ok: true as const, exists: true as const, account: updated }
    : { ok: false as const, reason: "档案会话更新失败。" };
}

export async function loginDbAccount(loginId: string, passcode: string) {
  const credentialError = validateCredentials(loginId, passcode);
  if (credentialError) return { ok: false as const, reason: credentialError };

  await ensureNormaTables();

  const normalizedLogin = normalizeLoginIdInput(loginId);
  const result = await getPool().query<NormaAccountRow>(
    `
      SELECT account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE login_id = $1 OR lower(email) = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  const account = result.rows[0];
  if (!account) return { ok: false as const, reason: "未检索到该邮箱，请先进行专员建档。" };
  if (account.email && !account.email_verified_at) {
    return { ok: false as const, reason: "邮箱尚未验证，请先完成验证。", requiresEmailVerification: true as const };
  }

  const passcodeCheck = await verifyPasscode(passcode, account.login_id, account.passcode_hash);
  if (!passcodeCheck.ok) {
    return { ok: false as const, reason: "通行密钥校验失败。" };
  }
  if (passcodeCheck.needsUpgrade) await updateDbPasscodeHash(account.account_id, await hashPasscode(passcode));

  const updated = await touchDbAccount(account.account_id);
  return updated
    ? { ok: true as const, account: updated }
    : { ok: false as const, reason: "档案会话更新失败。" };
}

async function touchDbAccount(accountId: string) {
  await ensureNormaTables();

  const result = await getPool().query<NormaAccountRow>(
    `
      UPDATE norma_agent_accounts
      SET last_login_at = now()
      WHERE account_id = $1
      RETURNING account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
    `,
    [accountId]
  );

  return result.rows[0] ? toPublicAccount(result.rows[0]) : null;
}

export async function createDbEmailVerificationToken(accountId: string, email: string) {
  await ensureNormaTables();

  const token = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const normalizedEmail = normalizeEmailInput(email);
  const expiresAt = new Date(Date.now() + emailVerificationTokenLifetimeMs);

  await getPool().query(
    `
      UPDATE norma_email_verification_tokens
      SET used_at = now()
      WHERE account_id = $1
        AND email = $2
        AND used_at IS NULL
    `,
    [accountId, normalizedEmail]
  );

  await getPool().query(
    `
      INSERT INTO norma_email_verification_tokens (token_hash, account_id, email, expires_at)
      VALUES ($1, $2, $3, $4)
    `,
    [tokenHash, accountId, normalizedEmail, expiresAt]
  );

  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyDbAccountEmail(token: string) {
  await ensureNormaTables();

  const tokenHash = hashEmailVerificationToken(token);
  const tokenResult = await getPool().query<EmailVerificationTokenRow>(
    `
      SELECT account_id, email, expires_at, used_at
      FROM norma_email_verification_tokens
      WHERE token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const verification = tokenResult.rows[0];
  if (!verification) return { ok: false as const, reason: "邮箱验证链接无效。" };
  if (verification.used_at) return { ok: false as const, reason: "邮箱验证链接已使用。" };
  if (verification.expires_at.getTime() < Date.now()) return { ok: false as const, reason: "邮箱验证链接已过期。" };

  await getPool().query(
    `
      UPDATE norma_email_verification_tokens
      SET used_at = now()
      WHERE token_hash = $1
    `,
    [tokenHash]
  );

  const accountResult = await getPool().query<NormaAccountRow>(
    `
      UPDATE norma_agent_accounts
      SET email_verified_at = COALESCE(email_verified_at, now()),
          last_login_at = now()
      WHERE account_id = $1
        AND lower(email) = $2
      RETURNING account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
    `,
    [verification.account_id, verification.email]
  );

  const account = accountResult.rows[0];
  if (!account) return { ok: false as const, reason: "未找到待验证的专员档案。" };

  return { ok: true as const, account: toPublicAccount(account) };
}

export async function resendDbEmailVerification(loginId: string) {
  const emailError = validateEmail(loginId);
  if (emailError) return { ok: false as const, reason: emailError };

  await ensureNormaTables();

  const normalizedEmail = normalizeEmailInput(loginId);
  const recentResult = await getPool().query<{ count: string }>(
    `
      SELECT count(*)::text
      FROM norma_email_verification_tokens
      WHERE email = $1
        AND created_at > now() - interval '1 hour'
    `,
    [normalizedEmail]
  );

  if (Number(recentResult.rows[0]?.count ?? 0) >= 5) {
    return { ok: false as const, reason: "验证邮件请求过于频繁，请稍后再试。" };
  }

  const accountResult = await getPool().query<NormaAccountRow>(
    `
      SELECT account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE lower(email) = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  const account = accountResult.rows[0];
  if (!account) return { ok: true as const, sent: false as const };
  if (account.email_verified_at) return { ok: true as const, alreadyVerified: true as const, account: toPublicAccount(account) };

  const verification = await createDbEmailVerificationToken(account.account_id, normalizedEmail);
  return { ok: true as const, sent: true as const, account: toPublicAccount(account), verification };
}

async function updateDbPasscodeHash(accountId: string, passcodeHash: string) {
  await ensureNormaTables();

  await getPool().query(
    `
      UPDATE norma_agent_accounts
      SET passcode_hash = $2
      WHERE account_id = $1
    `,
    [accountId, passcodeHash]
  );
}

export async function getDbAccount(accountId: string) {
  await ensureNormaTables();

  const result = await getPool().query<NormaAccountRow>(
    `
      SELECT account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE account_id = $1
      LIMIT 1
    `,
    [accountId]
  );

  return result.rows[0] ? toPublicAccount(result.rows[0]) : null;
}

export async function updateDbProfile(accountId: string, profile: AgentProfile) {
  await ensureNormaTables();

  const normalizedProfile = normalizeProfile(profile);
  const result = await getPool().query<NormaAccountRow>(
    `
      UPDATE norma_agent_accounts
      SET profile = $2::jsonb,
          last_login_at = now()
      WHERE account_id = $1
      RETURNING account_id, login_id, email, email_verified_at, passcode_hash, profile, created_at, last_login_at
    `,
    [accountId, JSON.stringify(normalizedProfile)]
  );

  return result.rows[0] ? toPublicAccount(result.rows[0]) : null;
}

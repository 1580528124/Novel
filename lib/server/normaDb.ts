import crypto from "node:crypto";
import { Pool } from "pg";
import {
  normalizeLoginIdInput,
  validateAgentName,
  validateCredentials
} from "@/lib/authValidation";
import { createAgentProfile, normalizeProfile, type AgentProfile } from "@/lib/agentProfile";

type NormaAccountRow = {
  account_id: string;
  login_id: string;
  passcode_hash: string;
  profile: AgentProfile;
  created_at: Date;
  last_login_at: Date;
};

type PublicAccount = {
  accountId: string;
  loginId: string;
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

function getPool() {
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

  if (!globalThis.normaDbPool) {
    globalThis.normaDbPool = new Pool({
      connectionString: databaseUrl
    });
  }

  return globalThis.normaDbPool;
}

function hashPasscode(passcode: string, loginId: string) {
  return crypto
    .createHash("sha256")
    .update(`${loginId}:${passcode}:NORMA-DB-AUTH-V1`)
    .digest("hex");
}

function toPublicAccount(row: NormaAccountRow): PublicAccount {
  return {
    accountId: row.account_id,
    loginId: row.login_id,
    profile: normalizeProfile(row.profile),
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at.toISOString()
  };
}

async function ensureNormaTables() {
  if (!globalThis.normaDbReady) {
    globalThis.normaDbReady = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS norma_agent_accounts (
          account_id TEXT PRIMARY KEY,
          login_id TEXT NOT NULL UNIQUE,
          passcode_hash TEXT NOT NULL,
          profile JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      .then(() => undefined);
  }

  await globalThis.normaDbReady;
}

export async function warmupNormaDb() {
  await ensureNormaTables();
  await getPool().query("SELECT 1");
  return { ok: true as const };
}

export async function registerDbAccount(loginId: string, passcode: string, agentName: string) {
  const credentialError = validateCredentials(loginId, passcode);
  if (credentialError) return { ok: false as const, reason: credentialError };

  const agentNameError = validateAgentName(agentName);
  if (agentNameError) return { ok: false as const, reason: agentNameError };

  await ensureNormaTables();

  const normalizedLogin = normalizeLoginIdInput(loginId);
  const accountId = `ACC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const profile = createAgentProfile(agentName.trim());
  const passcodeHash = hashPasscode(passcode, normalizedLogin);

  try {
    const result = await getPool().query<NormaAccountRow>(
      `
        INSERT INTO norma_agent_accounts (account_id, login_id, passcode_hash, profile)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING account_id, login_id, passcode_hash, profile, created_at, last_login_at
      `,
      [accountId, normalizedLogin, passcodeHash, JSON.stringify(profile)]
    );

    return { ok: true as const, account: toPublicAccount(result.rows[0]) };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return { ok: false as const, reason: "该登录代号已建档，请切换至身份校验。" };
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
      SELECT account_id, login_id, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE login_id = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  const account = result.rows[0];
  if (!account) return { ok: true as const, exists: false as const };

  if (account.passcode_hash !== hashPasscode(passcode, normalizedLogin)) {
    return { ok: false as const, reason: "通行密钥校验失败。" };
  }

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
      SELECT account_id, login_id, passcode_hash, profile, created_at, last_login_at
      FROM norma_agent_accounts
      WHERE login_id = $1
      LIMIT 1
    `,
    [normalizedLogin]
  );

  const account = result.rows[0];
  if (!account) return { ok: false as const, reason: "未检索到该登录代号，请先进行专员建档。" };
  if (account.passcode_hash !== hashPasscode(passcode, normalizedLogin)) {
    return { ok: false as const, reason: "通行密钥校验失败。" };
  }

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
      RETURNING account_id, login_id, passcode_hash, profile, created_at, last_login_at
    `,
    [accountId]
  );

  return result.rows[0] ? toPublicAccount(result.rows[0]) : null;
}

export async function getDbAccount(accountId: string) {
  await ensureNormaTables();

  const result = await getPool().query<NormaAccountRow>(
    `
      SELECT account_id, login_id, passcode_hash, profile, created_at, last_login_at
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
      RETURNING account_id, login_id, passcode_hash, profile, created_at, last_login_at
    `,
    [accountId, JSON.stringify(normalizedProfile)]
  );

  return result.rows[0] ? toPublicAccount(result.rows[0]) : null;
}

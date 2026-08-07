export type MissionScore = {
  missionId: string;
  accuracy: number;
  discipline: number;
  evidence: number;
  total: number;
  rating: "B" | "A" | "S";
  completedAt: string;
  choices: Record<string, string>;
};

export type AccessLog = {
  id: string;
  at: string;
  action: "ARCHIVE_ACCESS" | "DENIED_ACCESS" | "REPORT_VIEW" | "EVIDENCE_QUERY";
  target: string;
  result: "ALLOWED" | "DENIED" | "RECORDED";
  detail: string;
};

export type BloodRank = "C" | "B" | "A" | "S";
export type AccessLevel = 1 | 2 | 3 | 4 | 5;

export type BloodAssessment = {
  rank: BloodRank;
  percentile: number;
  seed: string;
  source: "3E_INITIAL_SCREENING";
  version: 1;
  assessedAt: string;
};

export type AgentProfile = {
  name: string;
  agentId: string;
  bloodRank: BloodRank;
  bloodAssessment: BloodAssessment;
  clearance: AccessLevel;
  department: "执行部临时专员" | "执行部";
  completedMissions: string[];
  unlockedArchives: string[];
  reviewedArchives: string[];
  accessLogs: AccessLog[];
  missionScores: Record<string, MissionScore>;
  lastLoginAt: string;
};

export type AgentAccountSession = {
  accountId: string;
  loginId: string;
  profile: AgentProfile;
  createdAt: string;
  lastLoginAt: string;
};

export type LocalAgentAccount = AgentAccountSession & {
  passcodeHash: string;
};

export type AuthResult =
  | { ok: true; account: AgentAccountSession }
  | { ok: false; reason: string };

const STORAGE_KEY = "norma.agent.profile.v1";
const ACCOUNTS_STORAGE_KEY = "norma.auth.accounts.v1";
const SESSION_STORAGE_KEY = "norma.auth.session.v1";

const bloodRankAccess: Record<BloodRank, AccessLevel> = {
  C: 1,
  B: 2,
  A: 3,
  S: 4
};

const accessLabels: Record<AccessLevel, string> = {
  1: "C级专员权限",
  2: "B级专员权限",
  3: "A级血统复核",
  4: "S级血统 / 校长室授权",
  5: "诺玛核心授权"
};

function hashAssessmentSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function assessBloodRank(name: string, agentId: string, assessedAt = new Date().toISOString()): BloodAssessment {
  const normalizedName = name.trim() || "未知专员";
  const seed = `${normalizedName}:${agentId}:NORMA-3E-V1`;
  const percentile = hashAssessmentSeed(seed) % 10000;
  const rank: BloodRank =
    percentile < 1200 ? "C" : percentile < 7600 ? "B" : percentile < 9800 ? "A" : "S";

  return {
    rank,
    percentile,
    seed,
    source: "3E_INITIAL_SCREENING",
    version: 1,
    assessedAt
  };
}

export function getBloodRankAccess(rank: BloodRank): AccessLevel {
  return bloodRankAccess[rank];
}

export function getEffectiveAccess(profile?: AgentProfile | null): AccessLevel {
  if (!profile) return 1;

  const bloodAccess = getBloodRankAccess(profile.bloodRank);
  const departmentAccess: AccessLevel = profile.department === "执行部" ? 2 : 1;
  const missionAccess: AccessLevel = profile.completedMissions?.length ? 2 : 1;
  const level = Math.max(profile.clearance, bloodAccess, departmentAccess, missionAccess);

  return Math.min(5, Math.max(1, level)) as AccessLevel;
}

export function formatAccessLabel(level: number): string {
  const normalized = Math.min(5, Math.max(1, Math.round(level))) as AccessLevel;
  return accessLabels[normalized];
}

export function formatAccessRequirement(level: number): string {
  return `需要 ${formatAccessLabel(level)}`;
}

export function formatAccessVerified(level: number): string {
  return `${formatAccessLabel(level)}校验通过`;
}

export function formatAgentAuthorization(profile?: AgentProfile | null): string {
  if (!profile) return "访客索引";
  return `${profile.bloodRank}级血统 / ${formatAccessLabel(getEffectiveAccess(profile))}`;
}

function createAgentId() {
  const suffix = Math.floor(100 + Math.random() * 900);
  return `ED-2026-${suffix}`;
}

function createAccountId() {
  return `ACC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function normalizeLoginId(loginId: string) {
  return loginId.trim().toLowerCase();
}

function hashPasscode(passcode: string, salt: string) {
  return String(hashAssessmentSeed(`${salt}:${passcode}:NORMA-AUTH-V1`));
}

export function createAgentProfile(name: string): AgentProfile {
  const trimmedName = name.trim() || "未知专员";
  const agentId = createAgentId();
  const bloodAssessment = assessBloodRank(trimmedName, agentId);

  return {
    name: trimmedName,
    agentId,
    bloodRank: bloodAssessment.rank,
    bloodAssessment,
    clearance: 1,
    department: "执行部临时专员",
    completedMissions: [],
    unlockedArchives: [],
    reviewedArchives: [],
    accessLogs: [],
    missionScores: {},
    lastLoginAt: new Date().toISOString()
  };
}

function normalizeAgentProfile(profile: AgentProfile): AgentProfile {
  const bloodAssessment = profile.bloodAssessment ?? assessBloodRank(profile.name, profile.agentId);

  return {
    ...profile,
    bloodRank: bloodAssessment.rank,
    bloodAssessment,
    completedMissions: profile.completedMissions ?? [],
    unlockedArchives: profile.unlockedArchives ?? [],
    reviewedArchives: profile.reviewedArchives ?? [],
    accessLogs: profile.accessLogs ?? [],
    missionScores: profile.missionScores ?? {}
  };
}

export function normalizeProfile(profile: AgentProfile): AgentProfile {
  return normalizeAgentProfile(profile);
}

function normalizeAccount(account: LocalAgentAccount): LocalAgentAccount {
  const profile = normalizeAgentProfile(account.profile);

  return {
    ...account,
    loginId: normalizeLoginId(account.loginId),
    profile,
    createdAt: account.createdAt ?? profile.lastLoginAt,
    lastLoginAt: account.lastLoginAt ?? profile.lastLoginAt
  };
}

export function loadLocalAccounts(): LocalAgentAccount[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const accounts = raw ? (JSON.parse(raw) as LocalAgentAccount[]) : [];
    return Array.isArray(accounts) ? accounts.map(normalizeAccount) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAgentAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts.map(normalizeAccount)));
}

export function saveLocalAccount(account: LocalAgentAccount) {
  const accounts = loadLocalAccounts();
  const normalized = normalizeAccount(account);
  const nextAccounts = accounts.some((item) => item.accountId === normalized.accountId)
    ? accounts.map((item) => (item.accountId === normalized.accountId ? normalized : item))
    : [normalized, ...accounts];

  saveLocalAccounts(nextAccounts);
}

export function createAuthSession(account: { accountId: string }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_STORAGE_KEY, account.accountId);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function loadAuthSession(): LocalAgentAccount | null {
  if (typeof window === "undefined") return null;

  const accountId = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!accountId) return null;

  return loadLocalAccounts().find((account) => account.accountId === accountId) ?? null;
}

export function loadAuthSessionAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}

export function registerLocalAccount(loginId: string, passcode: string, agentName: string): AuthResult {
  const normalizedLogin = normalizeLoginId(loginId);
  const normalizedName = agentName.trim() || loginId.trim();

  if (!normalizedLogin) return { ok: false, reason: "请输入登录代号。" };
  if (passcode.length < 4) return { ok: false, reason: "通行密钥至少需要 4 位。" };

  const accounts = loadLocalAccounts();
  if (accounts.some((account) => account.loginId === normalizedLogin)) {
    return { ok: false, reason: "该登录代号已建档，请直接登录。" };
  }

  const profile = createAgentProfile(normalizedName);
  const now = new Date().toISOString();
  const account: LocalAgentAccount = {
    accountId: createAccountId(),
    loginId: normalizedLogin,
    passcodeHash: hashPasscode(passcode, normalizedLogin),
    profile,
    createdAt: now,
    lastLoginAt: now
  };

  saveLocalAccount(account);
  createAuthSession(account);
  return { ok: true, account };
}

export function loginLocalAccount(loginId: string, passcode: string): AuthResult {
  const normalizedLogin = normalizeLoginId(loginId);
  const account = loadLocalAccounts().find((item) => item.loginId === normalizedLogin);

  if (!account) return { ok: false, reason: "未找到该专员档案。" };
  if (account.passcodeHash !== hashPasscode(passcode, normalizedLogin)) {
    return { ok: false, reason: "通行密钥校验失败。" };
  }

  const nextAccount = normalizeAccount({
    ...account,
    profile: touchAgentProfile(account.profile),
    lastLoginAt: new Date().toISOString()
  });

  saveLocalAccount(nextAccount);
  createAuthSession(nextAccount);
  return { ok: true, account: nextAccount };
}

export function updateLocalAccountProfile(accountId: string, profile: AgentProfile): LocalAgentAccount | null {
  const account = loadLocalAccounts().find((item) => item.accountId === accountId);
  if (!account) return null;

  const nextAccount = normalizeAccount({
    ...account,
    profile,
    lastLoginAt: new Date().toISOString()
  });

  saveLocalAccount(nextAccount);
  return nextAccount;
}

export function loadAgentProfile(): AgentProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeAgentProfile(JSON.parse(raw) as AgentProfile) : null;
  } catch {
    return null;
  }
}

export function saveAgentProfile(profile: AgentProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function touchAgentProfile(profile: AgentProfile, name?: string): AgentProfile {
  return {
    ...profile,
    reviewedArchives: profile.reviewedArchives ?? [],
    accessLogs: profile.accessLogs ?? [],
    name: name?.trim() || profile.name,
    lastLoginAt: new Date().toISOString()
  };
}

export function recordAccessLog(
  profile: AgentProfile,
  log: Omit<AccessLog, "id" | "at">
): AgentProfile {
  const entry: AccessLog = {
    ...log,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    at: new Date().toISOString()
  };

  return {
    ...profile,
    accessLogs: [entry, ...(profile.accessLogs ?? [])].slice(0, 30),
    lastLoginAt: new Date().toISOString()
  };
}

export function reviewArchive(profile: AgentProfile, archiveId: string): AgentProfile {
  return {
    ...profile,
    reviewedArchives: Array.from(new Set([...(profile.reviewedArchives ?? []), archiveId])),
    lastLoginAt: new Date().toISOString()
  };
}

export function completeMission(
  profile: AgentProfile,
  missionId: string,
  score: MissionScore,
  unlocks: string[]
): AgentProfile {
  const completedMissions = Array.from(new Set([...profile.completedMissions, missionId]));
  const unlockedArchives = Array.from(new Set([...profile.unlockedArchives, ...unlocks]));
  const elevated = score.rating === "S" || completedMissions.length > 0;

  return {
    ...profile,
    bloodRank: profile.bloodRank,
    bloodAssessment: profile.bloodAssessment,
    clearance: elevated ? 2 : profile.clearance,
    department: elevated ? "执行部" : profile.department,
    completedMissions,
    unlockedArchives,
    missionScores: {
      ...profile.missionScores,
      [missionId]: score
    },
    lastLoginAt: new Date().toISOString()
  };
}

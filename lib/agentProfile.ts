"use client";

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

export type AgentProfile = {
  name: string;
  agentId: string;
  bloodRank: "C" | "B" | "A" | "S";
  clearance: 1 | 2 | 3 | 4 | 5;
  department: "执行部临时专员" | "执行部";
  completedMissions: string[];
  unlockedArchives: string[];
  reviewedArchives: string[];
  accessLogs: AccessLog[];
  missionScores: Record<string, MissionScore>;
  lastLoginAt: string;
};

const STORAGE_KEY = "norma.agent.profile.v1";

function createAgentId() {
  const suffix = Math.floor(100 + Math.random() * 900);
  return `ED-2026-${suffix}`;
}

export function createAgentProfile(name: string): AgentProfile {
  return {
    name: name.trim() || "未知专员",
    agentId: createAgentId(),
    bloodRank: "A",
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
  return {
    ...profile,
    completedMissions: profile.completedMissions ?? [],
    unlockedArchives: profile.unlockedArchives ?? [],
    reviewedArchives: profile.reviewedArchives ?? [],
    accessLogs: profile.accessLogs ?? [],
    missionScores: profile.missionScores ?? {}
  };
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
    bloodRank: score.rating === "S" ? "S" : profile.bloodRank,
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

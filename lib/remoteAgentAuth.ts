import type { AgentAccountSession, AgentProfile, AuthResult } from "@/lib/agentProfile";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      signal: controller.signal
    });

    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function registerRemoteAccount(
  loginId: string,
  passcode: string,
  agentName: string
): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/register", { loginId, passcode, agentName });
}

export async function identifyRemoteAccount(loginId: string, passcode: string): Promise<
  | { ok: true; exists: true; account: AgentAccountSession }
  | { ok: true; exists: false }
  | { ok: false; reason: string }
> {
  return postJson("/api/auth/identify", { loginId, passcode });
}

export async function loginRemoteAccount(loginId: string, passcode: string): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/login", { loginId, passcode });
}

export async function loadRemoteSession(): Promise<AuthResult> {
  return postJson<AuthResult>("/api/auth/session", {});
}

export async function updateRemoteProfile(
  profile: AgentProfile
): Promise<{ ok: true; account: AgentAccountSession } | { ok: false; reason: string }> {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
    credentials: "same-origin"
  });

  return (await response.json()) as
    | { ok: true; account: AgentAccountSession }
    | { ok: false; reason: string };
}

export async function logoutRemoteAccount(): Promise<{ ok: true } | { ok: false; reason: string }> {
  return postJson("/api/auth/logout", {});
}

export async function warmupRemoteAuth(): Promise<{ ok: true } | { ok: false; reason: string }> {
  return postJson("/api/auth/warmup", {});
}

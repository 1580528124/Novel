import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getEffectiveAccess, type AgentAccountSession, type BloodRank } from "@/lib/agentProfile";

export const NORMA_AUTH_COOKIE = "norma_auth";

type NormaJwtPayload = {
  sub: string;
  loginId: string;
  agentId: string;
  bloodRank: BloodRank;
  accessLevel: number;
  iat: number;
  exp: number;
};

const tokenLifetimeSeconds = 60 * 60 * 24 * 7;

function getJwtSecret() {
  const secret = process.env.NORMA_JWT_SECRET ?? process.env.JWT_SECRET ?? process.env.DATABASE_URL;
  if (!secret) throw new Error("NORMA_JWT_SECRET is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(input: string) {
  return crypto.createHmac("sha256", getJwtSecret()).update(input).digest("base64url");
}

export function createNormaJwt(account: AgentAccountSession) {
  const now = Math.floor(Date.now() / 1000);
  const payload: NormaJwtPayload = {
    sub: account.accountId,
    loginId: account.loginId,
    agentId: account.profile.agentId,
    bloodRank: account.profile.bloodRank,
    accessLevel: getEffectiveAccess(account.profile),
    iat: now,
    exp: now + tokenLifetimeSeconds
  };

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;

  return `${unsigned}.${sign(unsigned)}`;
}

export function verifyNormaJwt(token?: string | null): NormaJwtPayload | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned);
  const actual = Buffer.from(signature);
  const trusted = Buffer.from(expected);

  if (actual.length !== trusted.length || !crypto.timingSafeEqual(actual, trusted)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as NormaJwtPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setNormaAuthCookie(account: AgentAccountSession) {
  cookies().set(NORMA_AUTH_COOKIE, createNormaJwt(account), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: tokenLifetimeSeconds
  });
}

export function clearNormaAuthCookie() {
  cookies().set(NORMA_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function getNormaAuthPayload() {
  return verifyNormaJwt(cookies().get(NORMA_AUTH_COOKIE)?.value);
}

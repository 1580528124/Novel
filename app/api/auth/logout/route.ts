import { NextResponse } from "next/server";
import { clearNormaAuthCookie } from "@/lib/server/normaJwt";

export const dynamic = "force-dynamic";

export async function POST() {
  clearNormaAuthCookie();
  return NextResponse.json({ ok: true });
}

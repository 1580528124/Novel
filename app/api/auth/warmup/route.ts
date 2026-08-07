import { NextResponse } from "next/server";
import { warmupNormaDb } from "@/lib/server/normaDb";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await warmupNormaDb();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "认证服务预热失败。" },
      { status: 500 }
    );
  }
}

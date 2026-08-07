import { NextResponse } from "next/server";
import { getDbAccount } from "@/lib/server/normaDb";
import { clearNormaAuthCookie, getNormaAuthPayload, setNormaAuthCookie } from "@/lib/server/normaJwt";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const payload = getNormaAuthPayload();
    if (!payload) {
      clearNormaAuthCookie();
      return NextResponse.json({ ok: false, reason: "会话已失效，请重新校验身份。" }, { status: 401 });
    }

    const account = await getDbAccount(payload.sub);
    if (!account) {
      clearNormaAuthCookie();
      return NextResponse.json({ ok: false, reason: "未找到该专员档案。" }, { status: 404 });
    }

    setNormaAuthCookie(account);
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "会话接口异常。" },
      { status: 500 }
    );
  }
}

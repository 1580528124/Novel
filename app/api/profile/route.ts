import { NextResponse } from "next/server";
import { updateDbProfile } from "@/lib/server/normaDb";
import { getNormaAuthPayload, setNormaAuthCookie } from "@/lib/server/normaJwt";
import type { AgentProfile } from "@/lib/agentProfile";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const payload = getNormaAuthPayload();
    if (!payload) {
      return NextResponse.json({ ok: false, reason: "会话已失效，请重新校验身份。" }, { status: 401 });
    }

    const body = (await request.json()) as {
      profile?: AgentProfile;
    };

    if (!body.profile) {
      return NextResponse.json({ ok: false, reason: "档案更新参数缺失。" }, { status: 400 });
    }

    const account = await updateDbProfile(payload.sub, body.profile);
    if (!account) {
      return NextResponse.json({ ok: false, reason: "未找到该专员档案。" }, { status: 404 });
    }

    setNormaAuthCookie(account);
    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "档案更新接口异常。" },
      { status: 500 }
    );
  }
}

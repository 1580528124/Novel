import { NextResponse } from "next/server";
import { registerDbAccount } from "@/lib/server/normaDb";
import { setNormaAuthCookie } from "@/lib/server/normaJwt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      loginId?: string;
      passcode?: string;
      agentName?: string;
    };

    const result = await registerDbAccount(body.loginId ?? "", body.passcode ?? "", body.agentName ?? "");
    if (result.ok) setNormaAuthCookie(result.account);

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "注册接口异常。" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { identifyDbAccount } from "@/lib/server/normaDb";
import { setNormaAuthCookie } from "@/lib/server/normaJwt";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      loginId?: string;
      passcode?: string;
    };

    const result = await identifyDbAccount(body.loginId ?? "", body.passcode ?? "");
    if (result.ok && result.exists) setNormaAuthCookie(result.account);

    return NextResponse.json(result, { status: result.ok ? 200 : 401 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "身份识别接口异常。" },
      { status: 500 }
    );
  }
}

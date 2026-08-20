import { NextResponse } from "next/server";
import { verifyDbAccountEmail } from "@/lib/server/normaDb";
import { setNormaAuthCookie } from "@/lib/server/normaJwt";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const redirectUrl = new URL("/", url.origin);

  try {
    const result = await verifyDbAccountEmail(token);
    if (!result.ok) {
      redirectUrl.searchParams.set("auth_error", result.reason);
      return NextResponse.redirect(redirectUrl);
    }

    setNormaAuthCookie(result.account);
    redirectUrl.searchParams.set("auth", "email_verified");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    redirectUrl.searchParams.set("auth_error", error instanceof Error ? error.message : "邮箱验证接口异常。");
    return NextResponse.redirect(redirectUrl);
  }
}

import { NextResponse } from "next/server";
import { resendDbEmailVerification } from "@/lib/server/normaDb";
import { sendVerificationEmail } from "@/lib/server/emailDelivery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      loginId?: string;
      email?: string;
    };
    const email = body.email ?? body.loginId ?? "";
    const result = await resendDbEmailVerification(email);

    if (result.ok && result.sent) {
      const baseUrl = process.env.EMAIL_VERIFY_BASE_URL ?? new URL("/api/auth/verify-email", request.url).toString();
      const verifyUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(result.verification.token)}`;

      await sendVerificationEmail({
        to: result.account.email ?? result.account.loginId,
        verifyUrl,
        agentName: result.account.profile.name
      });
    }

    if (result.ok && result.sent && (process.env.EMAIL_DELIVERY_MODE ?? "console") === "console") {
      const baseUrl = process.env.EMAIL_VERIFY_BASE_URL ?? new URL("/api/auth/verify-email", request.url).toString();
      const verifyUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(result.verification.token)}`;
      return NextResponse.json({ ok: true, sent: true, devVerifyUrl: verifyUrl });
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "验证邮件重发接口异常。" },
      { status: 500 }
    );
  }
}

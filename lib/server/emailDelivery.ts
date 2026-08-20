type VerificationEmailInput = {
  to: string;
  verifyUrl: string;
  agentName: string;
};

const deliveryMode = process.env.EMAIL_DELIVERY_MODE ?? "console";
const fromName = process.env.EMAIL_FROM_NAME ?? "NORMA";
const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "notice@example.com";

export async function sendVerificationEmail(input: VerificationEmailInput) {
  if (deliveryMode === "console") {
    console.info(
      [
        "[NORMA email verification]",
        `To: ${input.to}`,
        `From: ${fromName} <${fromAddress}>`,
        `Agent: ${input.agentName}`,
        `Verify URL: ${input.verifyUrl}`
      ].join("\n")
    );

    return { ok: true as const, mode: "console" as const };
  }

  throw new Error(`EMAIL_DELIVERY_MODE=${deliveryMode} is not implemented yet`);
}

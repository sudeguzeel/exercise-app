export type ResendVerificationResult =
  | { success: true }
  | { success: false; reason: "RESEND_FAILED" };

const MOCK_RESEND_DELAY_MS = 1200;
const RESEND_FAILURE_EMAIL = "hata@eposta.com";

export async function resendVerificationEmail(
  email: string,
): Promise<ResendVerificationResult> {
  await new Promise((resolve) =>
    setTimeout(resolve, MOCK_RESEND_DELAY_MS),
  );

  if (email.trim().toLocaleLowerCase() === RESEND_FAILURE_EMAIL) {
    return {
      success: false,
      reason: "RESEND_FAILED",
    };
  }

  return { success: true };
}

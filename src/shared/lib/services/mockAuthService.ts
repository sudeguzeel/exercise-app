import { normalizeEmail } from "@/shared/lib/validation/authValidation";

type MockAuthFailureReason =
  | "EMAIL_ALREADY_REGISTERED"
  | "REQUEST_FAILED";

export type MockAuthResult =
  | { success: true }
  | { success: false; reason: MockAuthFailureReason };

export type MockEmailVerificationState = {
  email: string | null;
  isVerified: boolean;
};

const MOCK_DELAY_MS = 1000;
const REGISTERED_EMAIL = "kayitli@eposta.com";
const RESEND_FAILURE_EMAIL = "hata@eposta.com";
const VERIFIED_EMAIL = "dogrulandi@eposta.com";

function waitForMockResponse() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

export async function registerWithEmail(
  email: string,
  _password: string,
): Promise<MockAuthResult> {
  await waitForMockResponse();

  if (normalizeEmail(email) === REGISTERED_EMAIL) {
    return { success: false, reason: "EMAIL_ALREADY_REGISTERED" };
  }

  return { success: true };
}

export async function resendSignupConfirmation(
  email: string,
): Promise<MockAuthResult> {
  await waitForMockResponse();

  if (normalizeEmail(email) === RESEND_FAILURE_EMAIL) {
    return { success: false, reason: "REQUEST_FAILED" };
  }

  return { success: true };
}

export async function getEmailVerificationState(
  expectedEmail?: string,
): Promise<MockEmailVerificationState> {
  const normalizedEmail = expectedEmail
    ? normalizeEmail(expectedEmail)
    : null;

  return {
    email: normalizedEmail,
    isVerified: normalizedEmail === VERIFIED_EMAIL,
  };
}

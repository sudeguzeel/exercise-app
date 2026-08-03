import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { getAuthCallbackParameters } from "@/shared/lib/authCallbackUrl";
import { supabase } from "@/shared/lib/supabase";
import { normalizeEmail } from "@/shared/lib/validation/authValidation";

const PENDING_VERIFICATION_EMAIL_KEY = "auth.pending-verification-email";
const EMAIL_VERIFICATION_CALLBACK_PATH = "auth-callback";

export type EmailVerificationState = {
  email: string | null;
  isVerified: boolean;
  requestFailed: boolean;
};

export type EmailVerificationResult =
  | { success: true }
  | { success: false };

export function getEmailVerificationRedirectUrl() {
  return Linking.createURL(EMAIL_VERIFICATION_CALLBACK_PATH);
}

export async function rememberPendingVerificationEmail(email: string) {
  try {
    await AsyncStorage.setItem(
      PENDING_VERIFICATION_EMAIL_KEY,
      normalizeEmail(email),
    );
  } catch {
    // Kayıt işlemi yalnızca yardımcı e-posta bilgisinin saklanmasına bağlı değil.
  }
}

export async function getPendingVerificationEmail() {
  try {
    return await AsyncStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingVerificationEmail() {
  try {
    await AsyncStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
  } catch {
    // Doğrulanan oturum, yardımcı e-posta kaydı silinemese de geçerlidir.
  }
}

export async function resendSignupConfirmation(
  email: string,
): Promise<EmailVerificationResult> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: getEmailVerificationRedirectUrl(),
    },
  });

  if (error) {
    return { success: false };
  }

  await rememberPendingVerificationEmail(email);

  return { success: true };
}

export async function getEmailVerificationState(
  expectedEmail?: string,
): Promise<EmailVerificationState> {
  const normalizedExpectedEmail = expectedEmail
    ? normalizeEmail(expectedEmail)
    : null;
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      email: normalizedExpectedEmail,
      isVerified: false,
      requestFailed: true,
    };
  }

  if (!session) {
    return {
      email: normalizedExpectedEmail,
      isVerified: false,
      requestFailed: false,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      email: normalizedExpectedEmail,
      isVerified: false,
      requestFailed: true,
    };
  }

  const verifiedEmail = user.email ? normalizeEmail(user.email) : null;
  const emailMatches =
    !normalizedExpectedEmail || normalizedExpectedEmail === verifiedEmail;

  return {
    email: verifiedEmail,
    isVerified: Boolean(user.email_confirmed_at) && emailMatches,
    requestFailed: false,
  };
}

export async function completeEmailVerificationFromUrl(url: string) {
  const parameters = getAuthCallbackParameters(url);
  const callbackError =
    parameters.get("error_description") ?? parameters.get("error");

  if (callbackError) {
    throw new Error("EMAIL_VERIFICATION_CALLBACK_FAILED");
  }

  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");

  if (!accessToken || !refreshToken) {
    throw new Error("EMAIL_VERIFICATION_CALLBACK_INVALID");
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw new Error("EMAIL_VERIFICATION_SESSION_FAILED");
  }

  const state = await getEmailVerificationState();

  if (!state.isVerified || !state.email) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  await clearPendingVerificationEmail();

  return state.email;
}

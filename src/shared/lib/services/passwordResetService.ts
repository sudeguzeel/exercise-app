import * as Linking from "expo-linking";

import { getAuthCallbackParameters } from "@/shared/lib/authCallbackUrl";
import i18n from "@/shared/i18n";
import { supabase } from "@/shared/lib/supabase";

const RESET_PASSWORD_CALLBACK_PATH = "reset-password";

function getInvalidLinkMessage() {
  return i18n.t("resetPassword.invalidLinkMessage");
}

export type EstablishPasswordResetSessionResult =
  | { success: true }
  | { success: false; message: string };

export function getPasswordResetRedirectUrl() {
  return Linking.createURL(RESET_PASSWORD_CALLBACK_PATH);
}

export async function establishPasswordResetSession(
  url: string,
): Promise<EstablishPasswordResetSessionResult> {
  const parameters = getAuthCallbackParameters(url);
  const callbackError =
    parameters.get("error_description") ?? parameters.get("error");

  if (callbackError) {
    return { success: false, message: getInvalidLinkMessage() };
  }

  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { success: false, message: getInvalidLinkMessage() };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return { success: false, message: getInvalidLinkMessage() };
  }

  return { success: true };
}

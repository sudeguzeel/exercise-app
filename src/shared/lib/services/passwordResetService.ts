import * as Linking from "expo-linking";

import { getAuthCallbackParameters } from "@/shared/lib/authCallbackUrl";
import { supabase } from "@/shared/lib/supabase";

const RESET_PASSWORD_CALLBACK_PATH = "reset-password";

const INVALID_LINK_MESSAGE =
  "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir sıfırlama bağlantısı iste.";

export type EstablishPasswordResetSessionResult =
  | { success: true }
  | { success: false; message: string };

export function getPasswordResetRedirectUrl() {
  return Linking.createURL(RESET_PASSWORD_CALLBACK_PATH);
}

// Supabase şifre sıfırlama linki de (e-posta doğrulama linki gibi)
// `flowType: "implicit"` olduğu için token'ları URL'in `#` sonrasında
// (fragment) gönderiyor; bu yüzden `access_token`/`refresh_token`'ı elle
// okuyup `setSession` ile oturumu kurmamız gerekiyor.
export async function establishPasswordResetSession(
  url: string,
): Promise<EstablishPasswordResetSessionResult> {
  const parameters = getAuthCallbackParameters(url);
  const callbackError =
    parameters.get("error_description") ?? parameters.get("error");

  if (callbackError) {
    return { success: false, message: INVALID_LINK_MESSAGE };
  }

  const accessToken = parameters.get("access_token");
  const refreshToken = parameters.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return { success: false, message: INVALID_LINK_MESSAGE };
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return { success: false, message: INVALID_LINK_MESSAGE };
  }

  return { success: true };
}

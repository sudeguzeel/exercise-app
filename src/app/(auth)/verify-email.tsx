import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AuthColors,
  AuthLayout,
  AuthTypography,
} from "@/shared/constants/theme";
import { supabase } from "@/shared/lib/supabase";
import {
  isValidEmail,
  normalizeEmail,
} from "@/shared/lib/validation/authValidation";

const MAIL_APP_URL = "mailto:";

export default function VerifyEmailScreen() {
  const { email: emailParameter } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const routeEmail = Array.isArray(emailParameter)
    ? emailParameter[0]
    : emailParameter;
  const email =
    routeEmail && isValidEmail(routeEmail)
      ? normalizeEmail(routeEmail)
      : null;

  const resendingRef = useRef(false);
  const openingMailRef = useRef(false);
  const [openingMail, setOpeningMail] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!email) {
      router.replace("/register");
    }
  }, [email]);

  if (!email) {
    return null;
  }

  const handleOpenEmail = async () => {
    if (openingMailRef.current) {
      return;
    }

    openingMailRef.current = true;
    setOpeningMail(true);

    try {
      const canOpenMailApp = await Linking.canOpenURL(MAIL_APP_URL);

      if (!canOpenMailApp) {
        throw new Error("Mail application is unavailable");
      }

      await Linking.openURL(MAIL_APP_URL);
    } catch {
      Alert.alert(
        "E-posta uygulaması açılamadı",
        "Cihazında kullanılabilir bir e-posta uygulaması bulunamadı.",
      );
    } finally {
      openingMailRef.current = false;
      setOpeningMail(false);
    }
  };

  const handleResend = async () => {
    if (resendingRef.current) {
      return;
    }

    resendingRef.current = true;
    setResending(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: "exercise-app",
        path: "email-verified",
      });

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setErrorMessage(
          "Doğrulama e-postası gönderilemedi. Lütfen tekrar dene.",
        );
        return;
      }

      setStatusMessage("Doğrulama e-postası tekrar gönderildi.");
    } catch {
      setErrorMessage(
        "Doğrulama e-postası gönderilemedi. Lütfen tekrar dene.",
      );
    } finally {
      resendingRef.current = false;
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    router.replace("/register");
  };

  // Doğrulama bağlantısı e-posta uygulamasında açılıyor; deep link her zaman
  // uygulamaya otomatik geri dönmeyi garanti etmediğinden (özellikle Expo Go
  // ile geliştirirken), kullanıcının linke tıkladıktan sonra kendi isteğiyle
  // giriş ekranına geçmesi için elle tetiklenen bir buton sunuyoruz. (Daha
  // önce burada uygulama her ön plana geldiğinde otomatik olarak /login'e
  // yönlendiren bir AppState dinleyicisi vardı; bu, kullanıcı linke hiç
  // dokunmadan sadece başka bir uygulamaya bakıp geri dönse bile onu
  // doğrulama ekranından atıyordu ve deep link'in kendisiyle de yarış
  // durumu oluşturuyordu — kaldırıldı.)
  const handleContinueToLogin = () => {
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons
              color={AuthColors.primaryDark}
              name="mail-outline"
              size={46}
            />
            <Ionicons
              color={AuthColors.primaryDark}
              name="checkmark"
              size={20}
              style={styles.iconCheck}
            />
          </View>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.title}
          >
            E-postanı doğrula
          </Text>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.description}
          >
            <Text style={styles.emailHighlight}>{email}</Text>
            {" adresine doğrulama bağlantısı gönderdik. Hesabını kullanmaya "}
            devam etmek için e-postandaki bağlantıya dokun.
          </Text>

          <Pressable
            accessibilityLabel={
              openingMail ? "E-posta uygulaması açılıyor" : "E-postayı aç"
            }
            accessibilityRole="button"
            accessibilityState={{
              disabled: openingMail,
              busy: openingMail,
            }}
            disabled={openingMail}
            onPress={handleOpenEmail}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !openingMail ? styles.buttonPressed : null,
              openingMail ? styles.buttonDisabled : null,
            ]}
          >
            {openingMail ? (
              <ActivityIndicator color={AuthColors.text} />
            ) : (
              <Text
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.primaryButtonText}
              >
                E-postayı aç
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel={
              resending
                ? "Doğrulama e-postası gönderiliyor"
                : "Doğrulama mailini tekrar gönder"
            }
            accessibilityRole="button"
            accessibilityState={{ disabled: resending, busy: resending }}
            disabled={resending}
            onPress={handleResend}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !resending ? styles.buttonPressed : null,
              resending ? styles.buttonDisabled : null,
            ]}
          >
            {resending ? (
              <ActivityIndicator color={AuthColors.primaryDark} />
            ) : (
              <Text
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.secondaryButtonText}
              >
                Doğrulama mailini tekrar gönder
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="E-postamı doğruladım, giriş ekranına git"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleContinueToLogin}
            style={styles.linkButton}
          >
            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.linkButtonText}
            >
              E-postamı doğruladım, giriş yap
            </Text>
          </Pressable>

          {statusMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.statusMessage}
            >
              {statusMessage}
            </Text>
          ) : null}

          {errorMessage ? (
            <Text
              accessibilityLiveRegion="assertive"
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.errorMessage}
            >
              {errorMessage}
            </Text>
          ) : null}

          <View style={styles.changeEmailRow}>
            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.changeEmailQuestion}
            >
              E-posta adresin yanlış mı?{" "}
            </Text>

            <Pressable
              accessibilityLabel="E-posta adresini değiştir"
              accessibilityRole="link"
              disabled={resending}
              hitSlop={8}
              onPress={handleChangeEmail}
            >
              <Text
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.changeEmailLink}
              >
                Değiştir
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: "100%",
    maxWidth: AuthLayout.maxContentWidth,
    flex: 1,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AuthLayout.horizontalPadding,
    paddingVertical: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: AuthColors.paleGreen,
  },
  iconCheck: {
    position: "absolute",
    right: 23,
    bottom: 24,
  },
  title: {
    marginTop: 28,
    color: AuthColors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 12,
    color: AuthColors.mutedText,
    fontSize: AuthTypography.body,
    lineHeight: AuthTypography.bodyLineHeight,
    textAlign: "center",
  },
  emailHighlight: {
    color: AuthColors.mutedText,
    fontWeight: "900",
  },
  primaryButton: {
    width: "100%",
    height: AuthLayout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    borderRadius: AuthLayout.controlRadius,
    backgroundColor: AuthColors.primary,
    shadowColor: AuthColors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: AuthColors.text,
    fontSize: AuthTypography.button,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    height: AuthLayout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: AuthLayout.controlRadius,
    backgroundColor: AuthColors.surface,
  },
  secondaryButtonText: {
    color: AuthColors.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  statusMessage: {
    marginTop: 10,
    color: AuthColors.primaryDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 10,
    color: AuthColors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  linkButton: {
    alignSelf: "center",
    marginTop: 20,
    paddingVertical: 6,
  },
  linkButtonText: {
    color: AuthColors.primary,
    fontSize: AuthTypography.link,
    fontWeight: "900",
    textAlign: "center",
  },
  changeEmailRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  changeEmailQuestion: {
    color: AuthColors.mutedText,
    fontSize: AuthTypography.link,
  },
  changeEmailLink: {
    color: AuthColors.primary,
    fontSize: AuthTypography.link,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

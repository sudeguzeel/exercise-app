import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
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
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
import {
  getEmailVerificationState,
  rememberPendingVerificationEmail,
  resendSignupConfirmation,
} from "@/shared/lib/services/emailVerificationService";
import {
  isValidEmail,
  normalizeEmail,
} from "@/shared/lib/validation/authValidation";

const MAIL_APP_URL = "mailto:";

export default function VerifyEmailScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const {
    callbackError: callbackErrorParameter,
    email: emailParameter,
  } = useLocalSearchParams<{
    callbackError?: string | string[];
    email?: string | string[];
  }>();
  const callbackError = Array.isArray(callbackErrorParameter)
    ? callbackErrorParameter[0]
    : callbackErrorParameter;
  const routeEmail = Array.isArray(emailParameter)
    ? emailParameter[0]
    : emailParameter;
  const displayedEmail =
    routeEmail && isValidEmail(routeEmail)
      ? normalizeEmail(routeEmail)
      : null;
  const navigationInProgressRef = useRef(false);
  const openingMailRef = useRef(false);
  const resendingRef = useRef(false);
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [openingMail, setOpeningMail] = useState(false);
  const [resending, setResending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState(callbackError ?? "");

  const navigateToVerified = useCallback((verifiedEmail?: string | null) => {
    if (navigationInProgressRef.current) {
      return;
    }

    navigationInProgressRef.current = true;
    router.replace({
      pathname: "/email-verified",
      params: verifiedEmail ? { email: verifiedEmail } : {},
    });
  }, []);

  const checkVerification = useCallback(async () => {
    const state = await getEmailVerificationState(displayedEmail ?? undefined);

    if (state.isVerified) {
      navigateToVerified(state.email ?? displayedEmail);
    } else if (state.requestFailed) {
      setErrorMessage(
        "Doğrulama durumu kontrol edilemedi. İnternet bağlantını kontrol edip tekrar dene.",
      );
    }

    return state;
  }, [displayedEmail, navigateToVerified]);

  useEffect(() => {
    let mounted = true;

    const initializeVerification = async () => {
      if (displayedEmail) {
        await rememberPendingVerificationEmail(displayedEmail);
      }

      const state = await checkVerification();

      if (
        mounted &&
        !state.isVerified &&
        !displayedEmail &&
        !navigationInProgressRef.current
      ) {
        router.replace("/register");
        return;
      }

      if (mounted) {
        setCheckingVerification(false);
      }
    };

    void initializeVerification();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void checkVerification();
        }
      },
    );

    return () => {
      mounted = false;
      appStateSubscription.remove();
    };
  }, [checkVerification, displayedEmail]);

  useFocusEffect(
    useCallback(() => {
      if (!checkingVerification && displayedEmail) {
        void checkVerification();
      }
    }, [checkVerification, checkingVerification, displayedEmail]),
  );

  const handleOpenEmail = async () => {
    if (openingMailRef.current) {
      return;
    }

    openingMailRef.current = true;
    setOpeningMail(true);

    try {
      const mailFallbackUrl = displayedEmail
        ? `mailto:${encodeURIComponent(displayedEmail)}`
        : MAIL_APP_URL;
      const mailAppUrls =
        Platform.OS === "ios"
          ? ["message://", mailFallbackUrl]
          : [mailFallbackUrl];

      for (const mailAppUrl of mailAppUrls) {
        try {
          const canOpenMailApp = await Linking.canOpenURL(mailAppUrl);

          if (canOpenMailApp) {
            await Linking.openURL(mailAppUrl);
            return;
          }
        } catch {
          // Bir sonraki platform uyumlu yöntemi dene.
        }
      }

      await Linking.openURL(mailFallbackUrl);
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

    if (!displayedEmail) {
      router.replace("/register");
      return;
    }

    resendingRef.current = true;
    setResending(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const result = await resendSignupConfirmation(displayedEmail);

      if (!result.success) {
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
    router.replace({
      pathname: "/register",
      params: displayedEmail ? { email: displayedEmail } : {},
    });
  };

  if (checkingVerification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons
              color={colors.primary}
              name="mail-outline"
              size={46}
            />
            <Ionicons
              color={colors.primary}
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
            <Text style={styles.emailHighlight}>{displayedEmail}</Text>
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
              <ActivityIndicator color={colors.onPrimary} />
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
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.secondaryButtonText}
              >
                Doğrulama mailini tekrar gönder
              </Text>
            )}
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

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

import {
  completeEmailVerificationFromUrl,
  getPendingVerificationEmail,
} from "@/shared/lib/services/emailVerificationService";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AuthColors, AuthTypography } from "@/shared/constants/theme";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";

const CALLBACK_ERROR_MESSAGE =
  "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Lütfen doğrulama mailini tekrar gönder.";

export default function AuthCallbackScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const linkingUrl = Linking.useLinkingURL();
  const callbackPromiseRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if (!linkingUrl) {
      return;
    }

    let mounted = true;

    const handleCallback = async () => {
      try {
        callbackPromiseRef.current ??=
          completeEmailVerificationFromUrl(linkingUrl);
        const verifiedEmail = await callbackPromiseRef.current;

        if (!mounted) {
          return;
        }

        router.replace({
          pathname: "/email-verified",
          params: { email: verifiedEmail },
        });
      } catch {
        const pendingEmail = await getPendingVerificationEmail();

        if (!mounted) {
          return;
        }

        router.replace({
          pathname: "/verify-email",
          params: {
            ...(pendingEmail ? { email: pendingEmail } : {}),
            callbackError: CALLBACK_ERROR_MESSAGE,
          },
        });
      }
    };

    void handleCallback();

    return () => {
      mounted = false;
    };
  }, [linkingUrl]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />

        <Text
          maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
          style={styles.message}
        >
          E-posta doğrulaması kontrol ediliyor...
        </Text>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  message: {
    marginTop: 16,
    color: AuthColors.mutedText,
    fontSize: AuthTypography.body,
    lineHeight: AuthTypography.bodyLineHeight,
    textAlign: "center",
  },
});

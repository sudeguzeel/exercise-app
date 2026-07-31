import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { getEmailVerificationState } from "@/shared/lib/services/mockAuthService";
import {
  isValidEmail,
  normalizeEmail,
} from "@/shared/lib/validation/authValidation";

export default function EmailVerifiedScreen() {
  const { email: emailParameter } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const routeEmail = Array.isArray(emailParameter)
    ? emailParameter[0]
    : emailParameter;
  const expectedEmail =
    routeEmail && isValidEmail(routeEmail)
      ? normalizeEmail(routeEmail)
      : null;
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    let mounted = true;

    const protectVerifiedScreen = async () => {
      const state = await getEmailVerificationState(
        expectedEmail ?? undefined,
      );

      if (!mounted) {
        return;
      }

      if (!state.isVerified) {
        router.replace(
          expectedEmail
            ? {
                pathname: "/verify-email",
                params: { email: expectedEmail },
              }
            : "/register",
        );
        return;
      }

      setCheckingVerification(false);
    };

    void protectVerifiedScreen();

    return () => {
      mounted = false;
    };
  }, [expectedEmail]);

  if (checkingVerification) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={AuthColors.primaryDark} size="large" />
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
              color={AuthColors.primaryDark}
              name="checkmark"
              size={46}
            />
          </View>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.title}
          >
            E-posta doğrulandı
          </Text>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.description}
          >
            Hesabın başarıyla doğrulandı. Şimdi kişisel bilgilerini tamamlayarak
            programını oluşturabilirsin.
          </Text>

          <Pressable
            accessibilityLabel="Devam et"
            accessibilityRole="button"
            onPress={() => router.replace("/onboarding/personal-info")}
            style={({ pressed }) => [
              styles.continueButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.continueButtonText}
            >
              Devam et
            </Text>
          </Pressable>
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
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: AuthColors.paleGreen,
  },
  title: {
    marginTop: 30,
    color: AuthColors.text,
    fontSize: AuthTypography.title,
    lineHeight: AuthTypography.titleLineHeight,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    maxWidth: 420,
    marginTop: 14,
    color: AuthColors.mutedText,
    fontSize: AuthTypography.body,
    lineHeight: AuthTypography.bodyLineHeight,
    textAlign: "center",
  },
  continueButton: {
    width: "100%",
    height: AuthLayout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 34,
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
  continueButtonText: {
    color: AuthColors.text,
    fontSize: AuthTypography.button,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.82,
  },
});

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
import { supabase } from "@/shared/lib/supabase";

export default function EmailVerifiedScreen() {
  const { code } = useLocalSearchParams<{ code?: string | string[] }>();

  const [verifying, setVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    const verifyCode = async () => {
      const authCode = Array.isArray(code) ? code[0] : code;

      if (!authCode) {
        setVerificationError(
          "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama bağlantısı iste.",
        );
        setVerifying(false);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(authCode);

      if (error) {
        setVerificationError(
          "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeni bir doğrulama bağlantısı iste.",
        );
      }

      setVerifying(false);
    };

    void verifyCode();
  }, [code]);

  const handleContinue = () => {
    router.replace("/onboarding/personal-info");
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color={AuthColors.primaryDark} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (verificationError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons
              color={AuthColors.error}
              name="alert-circle-outline"
              size={40}
            />
          </View>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.title}
          >
            Bağlantı geçersiz
          </Text>

          <Text
            maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
            style={styles.description}
          >
            {verificationError}
          </Text>

          <Pressable
            accessibilityLabel="Kayıt ekranına dön"
            accessibilityRole="button"
            onPress={() => router.replace("/register")}
            style={({ pressed }) => [
              styles.continueButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.continueButtonText}
            >
              Kayıt ekranına dön
            </Text>
          </Pressable>
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
            onPress={handleContinue}
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
  scrollContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AuthLayout.horizontalPadding,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: AuthColors.errorBackground,
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

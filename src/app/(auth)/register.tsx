import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AuthColors,
  AuthLayout,
  AuthTypography,
} from "@/shared/constants/theme";
import { registerWithEmail } from "@/shared/lib/services/mockAuthService";
import {
  isValidEmail,
  normalizeEmail,
} from "@/shared/lib/validation/authValidation";

const INVALID_EMAIL_MESSAGE = "Lütfen geçerli bir e-posta adresi gir.";
const INVALID_PASSWORD_MESSAGE = "Şifre en az 8 karakter olmalıdır.";

export default function RegisterScreen() {
  const { email: emailParameter } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const initialEmail = Array.isArray(emailParameter)
    ? emailParameter[0]
    : emailParameter;
  const passwordInputRef = useRef<TextInput>(null);
  const registrationInProgressRef = useRef(false);
  const [email, setEmail] = useState(() =>
    initialEmail && isValidEmail(initialEmail)
      ? normalizeEmail(initialEmail)
      : "",
  );
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const emailIsValid = isValidEmail(email);
    const passwordIsValid = password.length >= 8;

    setEmailError(emailIsValid ? "" : INVALID_EMAIL_MESSAGE);
    setPasswordError(passwordIsValid ? "" : INVALID_PASSWORD_MESSAGE);
    setFormError("");

    return emailIsValid && passwordIsValid;
  };

  const handleRegister = async () => {
    if (registrationInProgressRef.current || !validateForm()) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    registrationInProgressRef.current = true;
    setLoading(true);

    try {
      const result = await registerWithEmail(normalizedEmail, password);

      if (!result.success) {
        if (result.reason === "EMAIL_ALREADY_REGISTERED") {
          setEmailError(
            "Bu e-posta adresiyle daha önce hesap oluşturulmuş. Giriş yapmayı deneyebilirsin.",
          );
        } else {
          setFormError("Hesap oluşturulamadı. Lütfen tekrar dene.");
        }

        return;
      }

      router.replace({
        pathname: "/verify-email",
        params: { email: normalizedEmail },
      });
    } catch {
      setFormError("Hesap oluşturulamadı. Lütfen tekrar dene.");
    } finally {
      registrationInProgressRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Pressable
              accessibilityLabel="Giriş ekranına dön"
              accessibilityRole="button"
              disabled={loading}
              hitSlop={8}
              onPress={() => router.replace("/login")}
              style={({ pressed }) => [
                styles.backButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              <Ionicons
                color={AuthColors.text}
                name="chevron-back"
                size={22}
              />
            </Pressable>

            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.title}
            >
              Hesap{"\n"}oluştur
            </Text>

            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.description}
            >
              E-posta ve şifrenle hesabını oluştur. Kişisel bilgilerini sonraki
              adımda alacağız.
            </Text>

            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.label}
            >
              E-POSTA
            </Text>

            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons
                color={AuthColors.mutedText}
                name="mail-outline"
                size={19}
              />

              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                keyboardType="email-address"
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                onChangeText={(value) => {
                  setEmail(value);
                  setFormError("");

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                placeholder="ornek@eposta.com"
                placeholderTextColor={AuthColors.placeholder}
                returnKeyType="next"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>

            {emailError ? (
              <Text
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.errorText}
              >
                {emailError}
              </Text>
            ) : null}

            <Text
              maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
              style={styles.label}
            >
              ŞİFRE
            </Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons
                color={AuthColors.mutedText}
                name="lock-closed-outline"
                size={20}
              />

              <TextInput
                ref={passwordInputRef}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                editable={!loading}
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                onChangeText={(value) => {
                  setPassword(value);
                  setFormError("");

                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                onSubmitEditing={handleRegister}
                placeholder="En az 8 karakter"
                placeholderTextColor={AuthColors.placeholder}
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType="newPassword"
                value={password}
              />
            </View>

            {passwordError ? (
              <Text
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.errorText}
              >
                {passwordError}
              </Text>
            ) : null}

            {formError ? (
              <Text
                accessibilityLiveRegion="assertive"
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.formErrorText}
              >
                {formError}
              </Text>
            ) : null}

            <Pressable
              accessibilityLabel={
                loading ? "Hesap oluşturuluyor" : "Hesap oluştur"
              }
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.registerButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={AuthColors.text} />
              ) : (
                <Text
                  maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                  style={styles.registerButtonText}
                >
                  Hesap oluştur
                </Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text
                maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                style={styles.loginQuestion}
              >
                Zaten hesabın var mı?{" "}
              </Text>

              <Pressable
                accessibilityLabel="Giriş yap"
                accessibilityRole="link"
                disabled={loading}
                hitSlop={8}
                onPress={() => router.replace("/login")}
              >
                <Text
                  maxFontSizeMultiplier={AuthTypography.maxFontSizeMultiplier}
                  style={styles.loginLink}
                >
                  Giriş yap
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: "100%",
    maxWidth: AuthLayout.maxContentWidth,
    flex: 1,
    alignSelf: "center",
    paddingHorizontal: AuthLayout.horizontalPadding,
    paddingTop: 16,
    paddingBottom: 28,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: 24,
    backgroundColor: AuthColors.surface,
  },
  title: {
    marginTop: 30,
    color: AuthColors.text,
    fontSize: AuthTypography.title,
    lineHeight: AuthTypography.titleLineHeight,
    fontWeight: "900",
  },
  description: {
    marginTop: 10,
    color: AuthColors.mutedText,
    fontSize: AuthTypography.body,
    lineHeight: AuthTypography.bodyLineHeight,
  },
  label: {
    marginTop: 26,
    marginBottom: 8,
    color: AuthColors.mutedText,
    fontSize: AuthTypography.label,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  inputContainer: {
    minHeight: AuthLayout.controlHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: AuthLayout.controlRadius,
    backgroundColor: AuthColors.surface,
  },
  inputContainerError: {
    borderColor: AuthColors.error,
    backgroundColor: AuthColors.errorBackground,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 14,
    color: AuthColors.text,
    fontSize: AuthTypography.input,
  },
  errorText: {
    marginTop: 8,
    marginHorizontal: 4,
    color: AuthColors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  formErrorText: {
    marginTop: 12,
    color: AuthColors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  registerButton: {
    height: AuthLayout.controlHeight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
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
  registerButtonText: {
    color: AuthColors.text,
    fontSize: AuthTypography.button,
    fontWeight: "900",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginQuestion: {
    color: AuthColors.mutedText,
    fontSize: AuthTypography.link,
  },
  loginLink: {
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

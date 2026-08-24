import { useOnboarding } from "@/providers/OnboardingContext";
import { PasswordVisibilityButton } from "@/shared/components/password-visibility-button";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
import {
  getEmailVerificationRedirectUrl,
  rememberPendingVerificationEmail,
} from "@/shared/lib/services/emailVerificationService";
import { supabase } from "@/shared/lib/supabase";
import { isValidEmail } from "@/shared/lib/validation/authValidation";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const { resetOnboarding } = useOnboarding();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    let isValid = true;

    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError(t("common.emailRequired"));
      isValid = false;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError(t("common.emailInvalid"));
      isValid = false;
    }

    if (!password) {
      setPasswordError(t("common.passwordRequired"));
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(t("register.passwordTooShort"));
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError(t("register.confirmPasswordRequired"));
      isValid = false;
    } else if (password && confirmPassword !== password) {
      setConfirmPasswordError(t("register.passwordsDontMatch"));
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getEmailVerificationRedirectUrl(),
        },
      });

      if (error) {
        Alert.alert(
          t("register.signupFailedTitle"),
          error.message.includes("already registered")
            ? t("register.alreadyRegistered")
            : error.message,
        );
        return;
      }

      const isExistingAccount = data.user?.identities?.length === 0;

      if (isExistingAccount) {
        Alert.alert(
          t("register.signupFailedTitle"),
          t("register.existingAccountMessage"),
        );
        return;
      }

      resetOnboarding();

      if (!data.session) {
        // Supabase projesinde "Confirm email" kapalıysa buraya hiç
        // düşülmez (signUp anında session döner). Açık olduğu ihtimale
        // karşı doğrulama bekleme ekranına yönlendiriyoruz.
        await rememberPendingVerificationEmail(email.trim());

        router.replace({
          pathname: "/verify-email",
          params: { email: email.trim() },
        });
        return;
      }

      // "Confirm email" kapalı olduğu için normal durum bu: hesap anında
      // hazır, doğrulama beklemeden direkt onboarding'e geçiyoruz.
      router.replace("/onboarding/personal-info");
    } catch {
      Alert.alert(t("common.genericErrorTitle"), t("common.genericErrorMessage"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Pressable
              disabled={loading}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>

            <Text style={styles.title}>{t("register.title")}</Text>

            <Text style={styles.subtitle}>
              {t("register.subtitle")}
            </Text>

            <Text style={styles.label}>{t("common.emailLabel")}</Text>

            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="mail-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder={t("common.emailPlaceholder")}
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <Text style={styles.label}>{t("common.passwordLabel")}</Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder={t("common.passwordPlaceholder")}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!isPasswordVisible}
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
              <PasswordVisibilityButton
                disabled={loading}
                onPress={() => setIsPasswordVisible((current) => !current)}
                visible={isPasswordVisible}
              />
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <Text style={styles.label}>{t("register.confirmPasswordLabel")}</Text>

            <View
              style={[
                styles.inputContainer,
                confirmPasswordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={19} color={colors.textSecondary} />

              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (confirmPasswordError) {
                    setConfirmPasswordError("");
                  }
                }}
                placeholder={t("common.passwordPlaceholder")}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!isConfirmPasswordVisible}
                editable={!loading}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <PasswordVisibilityButton
                disabled={loading}
                onPress={() =>
                  setIsConfirmPasswordVisible((current) => !current)
                }
                visible={isConfirmPasswordVisible}
              />
            </View>

            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.registerButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.registerButtonText}>{t("register.submit")}</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>{t("register.haveAccount")}</Text>

              <Pressable disabled={loading} onPress={() => router.replace("/login")}>
                <Text style={styles.loginLink}>{t("common.signIn")}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
  },
  title: {
    color: "#14171A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 24,
    color: "#6C716C",
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    marginTop: 15,
    marginBottom: 7,
    color: "#6C716C",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  inputContainerError: {
    borderColor: "#FF5A5A",
    backgroundColor: "rgba(255, 90, 90, 0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    color: "#14171A",
    fontSize: 15,
  },
  errorText: {
    marginTop: 6,
    marginHorizontal: 2,
    color: "#FF5A5A",
    fontSize: 12,
  },
  registerButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 21,
    borderRadius: 16,
    backgroundColor: "#95D600",
    shadowColor: "#95D600",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    color: "#101214",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  loginQuestion: {
    color: "#6C716C",
    fontSize: 13,
  },
  loginLink: {
    color: "#74A800",
    fontSize: 13,
    fontWeight: "800",
  },
});

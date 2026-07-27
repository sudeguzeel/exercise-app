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

import { registerUser } from "@/services/auth/mock-register";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { email: emailParam } = useLocalSearchParams<{
    email?: string | string[];
  }>();
  const initialEmail = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  const [email, setEmail] = useState(() => {
    const normalizedEmail = initialEmail?.trim().toLocaleLowerCase() ?? "";

    return EMAIL_PATTERN.test(normalizedEmail) ? normalizedEmail : "";
  });
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);
  const registerInProgressRef = useRef(false);

  const validateForm = () => {
    let isValid = true;
    const trimmedEmail = email.trim();

    setEmailError("");
    setPasswordError("");

    if (!trimmedEmail) {
      setEmailError("E-posta alanı boş bırakılamaz.");
      isValid = false;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailError("Geçerli bir e-posta adresi gir.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Şifre alanı boş bırakılamaz.");
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError("Şifre en az 8 karakter olmalı.");
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (registerInProgressRef.current || !validateForm()) {
      return;
    }

    const normalizedEmail = email.trim().toLocaleLowerCase();
    registerInProgressRef.current = true;

    try {
      setLoading(true);

      const result = await registerUser({
        email: normalizedEmail,
        password,
      });

      if (!result.success) {
        setEmailError(
          "Bu e-posta adresiyle daha önce hesap oluşturulmuş.",
        );
        return;
      }

      router.replace({
        pathname: "/verify-email",
        params: {
          email: normalizedEmail,
        },
      });
    } finally {
      registerInProgressRef.current = false;
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
              onPress={() => router.replace("/login")}
              accessibilityLabel="Giriş ekranına dön"
              style={({ pressed }) => [
                styles.backButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color="#14171A" />
            </Pressable>

            <Text style={styles.title}>Hesap{"\n"}oluştur</Text>

            <Text style={styles.description}>
              E-posta ve şifrenle hesabını oluştur. Kişisel bilgilerini sonraki
              adımda alacağız.
            </Text>

            <Text style={styles.label}>E-POSTA</Text>

            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="mail-outline" size={19} color="#6C716C" />

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder="ornek@eposta.com"
                placeholderTextColor="#7A7F78"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <Text style={styles.label}>ŞİFRE</Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color="#6C716C"
              />

              <TextInput
                ref={passwordInputRef}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);

                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder="En az 8 karakter girin"
                placeholderTextColor="#7A7F78"
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={!loading}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <Pressable
                disabled={loading}
                onPress={() => setPasswordVisible((current) => !current)}
                accessibilityLabel={
                  passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"
                }
                hitSlop={8}
                style={styles.passwordVisibilityButton}
              >
                <Ionicons
                  name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                  size={21}
                  color="#6C716C"
                />
              </Pressable>
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <View
              accessible
              accessibilityLabel={
                password.length >= 8
                  ? "Şifre uzunluğu uygun"
                  : "Şifre henüz 8 karakter değil"
              }
              style={styles.passwordStatusContainer}
            >
              <Ionicons
                name={
                  password.length >= 8
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={17}
                color={password.length >= 8 ? "#74A800" : "#8A8F87"}
              />
            </View>

            <Text style={styles.termsText}>
              Hesap oluşturarak{" "}
              <Text style={styles.termsHighlight}>Kullanım Koşulları</Text> ve{" "}
              <Text style={styles.termsHighlight}>Gizlilik Politikası</Text>
              &apos;nı kabul etmiş olursun.
            </Text>

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
                <ActivityIndicator color="#101214" />
              ) : (
                <Text style={styles.registerButtonText}>Hesap oluştur</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>Zaten hesabın var mı? </Text>

              <Pressable
                disabled={loading}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.loginLink}>Giriş yap</Text>
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
    maxWidth: 440,
    flex: 1,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  title: {
    marginTop: 26,
    color: "#14171A",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: "#6C716C",
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    marginTop: 23,
    marginBottom: 8,
    color: "#6C716C",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inputContainer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.38)",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  inputContainerError: {
    borderColor: "#FF5A5A",
    backgroundColor: "rgba(255, 90, 90, 0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 11,
    paddingVertical: 14,
    color: "#14171A",
    fontSize: 15,
  },
  passwordVisibilityButton: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    padding: 4,
  },
  errorText: {
    marginTop: 6,
    marginHorizontal: 2,
    color: "#FF5A5A",
    fontSize: 12,
  },
  passwordStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginHorizontal: 2,
    minHeight: 17,
  },
  termsText: {
    marginTop: 18,
    color: "#6C716C",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  termsHighlight: {
    color: "#74A800",
    fontWeight: "800",
  },
  registerButton: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: "#A4DE3D",
    shadowColor: "#95D600",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  registerButtonText: {
    color: "#101214",
    fontSize: 16,
    fontWeight: "900",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  loginQuestion: {
    color: "#6C716C",
    fontSize: 13,
  },
  loginLink: {
    color: "#95D600",
    fontSize: 13,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validateForm = () => {
    let isValid = true;

    setEmailError("");
    setPasswordError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("E-posta alanı boş bırakılamaz.");
      isValid = false;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError("Geçerli bir e-posta adresi gir.");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Şifre alanı boş bırakılamaz.");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      console.log("SUPABASE LOGIN ÇALIŞTI", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log("EMAIL:", email);
      console.log("DATA:", data);
      console.log("ERROR:", error);

      if (error || !data.session) {
        Alert.alert("Giriş yapılamadı", "E-posta adresi veya şifre hatalı.");
        return;
      }

      router.replace("/(tabs)");
    } catch {
      Alert.alert("Bir hata oluştu", "Bağlantını kontrol edip tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      "Google ile giriş",
      "Google giriş entegrasyonu ilgili görev tamamlandığında bağlanacak.",
    );
  };

  const handleAppleLogin = () => {
    Alert.alert(
      "Apple ile giriş",
      "Apple giriş entegrasyonu ilgili görev tamamlandığında bağlanacak.",
    );
  };

  const handleRegister = () => {
    Alert.alert("Kayıt ol", "Kayıt ekranı hazır olduğunda buraya bağlanacak.");
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
            <Text style={styles.title}>Hoş geldin</Text>

            <Text style={styles.subtitle}>
              Programına devam etmek için giriş yap.
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
                placeholderTextColor="#9A9E99"
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

            <Text style={styles.label}>ŞİFRE</Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={19} color="#6C716C" />

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);

                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor="#9A9E99"
                secureTextEntry
                editable={!loading}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={() => router.push("/forgot-password")}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>Şifremi unuttum</Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#101214" />
              ) : (
                <Text style={styles.loginButtonText}>Giriş yap</Text>
              )}
            </Pressable>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>VEYA</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                disabled={loading}
                onPress={handleGoogleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed ? styles.socialButtonPressed : null,
                ]}
              >
                <Text style={styles.googleLetter}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </Pressable>

              <Pressable
                disabled={loading}
                onPress={handleAppleLogin}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed ? styles.socialButtonPressed : null,
                ]}
              >
                <Ionicons name="logo-apple" size={19} color="#14171A" />
                <Text style={styles.socialButtonText}>Apple</Text>
              </Pressable>
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerQuestion}>Hesabın yok mu? </Text>

              <Pressable disabled={loading} onPress={handleRegister}>
                <Text style={styles.registerLink}>Kayıt ol</Text>
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
    justifyContent: "center",
  },
  container: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 11,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: "#74A800",
    fontSize: 13,
    fontWeight: "700",
  },
  loginButton: {
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
  loginButtonText: {
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 21,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(116, 168, 0, 0.35)",
  },
  dividerText: {
    marginHorizontal: 11,
    color: "#6C716C",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  socialRow: {
    flexDirection: "row",
    gap: 10,
  },
  socialButton: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  socialButtonPressed: {
    backgroundColor: "#EFF1EA",
  },
  socialButtonText: {
    color: "#14171A",
    fontSize: 13,
    fontWeight: "700",
  },
  googleLetter: {
    color: "#4285F4",
    fontSize: 17,
    fontWeight: "900",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  registerQuestion: {
    color: "#6C716C",
    fontSize: 13,
  },
  registerLink: {
    color: "#74A800",
    fontSize: 13,
    fontWeight: "800",
  },
});

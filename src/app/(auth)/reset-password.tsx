import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
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

import { establishPasswordResetSession } from "@/shared/lib/services/passwordResetService";
import { supabase } from "@/shared/lib/supabase";

export default function ResetPasswordScreen() {
  const linkingUrl = Linking.useLinkingURL();
  const sessionPromiseRef = useRef<Promise<void> | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [preparing, setPreparing] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!linkingUrl || sessionPromiseRef.current) {
      return;
    }

    const prepareSession = async () => {
      const result = await establishPasswordResetSession(linkingUrl);

      if (!result.success) {
        setSessionError(result.message);
      }

      setPreparing(false);
    };

    sessionPromiseRef.current = prepareSession();
  }, [linkingUrl]);

  const validateForm = () => {
    let isValid = true;

    setPasswordError("");
    setConfirmPasswordError("");

    if (!password) {
      setPasswordError("Şifre alanı boş bırakılamaz.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Şifre en az 6 karakter olmalı.");
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Şifre tekrarı boş bırakılamaz.");
      isValid = false;
    } else if (password && confirmPassword !== password) {
      setConfirmPasswordError("Şifreler eşleşmiyor.");
      isValid = false;
    }

    return isValid;
  };

  const handleResetPassword = async () => {
    if (loading || !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        Alert.alert("İşlem başarısız", error.message);
        return;
      }

      await supabase.auth.signOut();

      Alert.alert(
        "Şifren güncellendi",
        "Yeni şifrenle giriş yapabilirsin.",
        [{ text: "Tamam", onPress: () => router.replace("/login") }],
      );
    } catch {
      Alert.alert("Hata", "Bağlantı sağlanamadı. Lütfen tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  };

  if (preparing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#74A800" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={40} color="#FF5A5A" />
          </View>

          <Text style={styles.title}>Bağlantı geçersiz</Text>

          <Text style={styles.description}>{sessionError}</Text>

          <Pressable
            onPress={() => router.replace("/forgot-password")}
            style={({ pressed }) => [
              styles.sendButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.sendButtonText}>Yeni bağlantı iste</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Yeni{"\n"}şifre belirle</Text>

            <Text style={styles.description}>
              Hesabın için yeni bir şifre oluştur. Şifren en az 6 karakter
              olmalı.
            </Text>

            <Text style={styles.label}>YENİ ŞİFRE</Text>

            <View
              style={[
                styles.inputContainer,
                passwordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#6C716C" />

              <TextInput
                value={password}
                onChangeText={(value) => {
                  setPassword(value);

                  if (passwordError) {
                    setPasswordError("");
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor="#7A7F78"
                secureTextEntry
                editable={!loading}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <Text style={styles.label}>ŞİFRE TEKRAR</Text>

            <View
              style={[
                styles.inputContainer,
                confirmPasswordError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#6C716C" />

              <TextInput
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);

                  if (confirmPasswordError) {
                    setConfirmPasswordError("");
                  }
                }}
                placeholder="••••••••"
                placeholderTextColor="#7A7F78"
                secureTextEntry
                editable={!loading}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
            </View>

            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={handleResetPassword}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#101214" />
              ) : (
                <Text style={styles.sendButtonText}>Şifreyi güncelle</Text>
              )}
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={() => router.replace("/login")}
              style={({ pressed }) => [
                styles.loginLinkButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.loginLinkText}>
                Giriş ekranına{" "}
                <Text style={styles.loginLinkHighlight}>geri dön</Text>
              </Text>
            </Pressable>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 58,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255, 90, 90, 0.1)",
  },
  title: {
    color: "#14171A",
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    textAlign: "left",
  },
  description: {
    marginTop: 16,
    color: "#6C716C",
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    marginTop: 28,
    marginBottom: 8,
    color: "#6C716C",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inputContainer: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.38)",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  inputContainerError: {
    borderColor: "#FF5A5A",
    backgroundColor: "rgba(255, 90, 90, 0.06)",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#14171A",
    fontSize: 16,
  },
  errorText: {
    marginTop: 7,
    marginLeft: 3,
    color: "#FF5A5A",
    fontSize: 12,
  },
  sendButton: {
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    borderRadius: 18,
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
  sendButtonText: {
    color: "#101214",
    fontSize: 17,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginLinkButton: {
    alignSelf: "center",
    marginTop: 30,
    paddingVertical: 8,
  },
  loginLinkText: {
    color: "#6C716C",
    fontSize: 15,
    fontWeight: "700",
  },
  loginLinkHighlight: {
    color: "#95D600",
    fontWeight: "900",
  },
});

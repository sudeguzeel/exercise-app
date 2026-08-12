import { getPasswordResetRedirectUrl } from "@/shared/lib/services/passwordResetService";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
import { supabase } from "@/shared/lib/supabase";
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

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSendLink = async () => {
    if (loading) return;

    setEmailError("");

    const trimmedEmail = email.trim();

    // 1. Boş E-posta Kontrolü
    if (!trimmedEmail) {
      setEmailError("E-posta alanı boş bırakılamaz.");
      return;
    }

    // 2. Format Doğrulaması
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Geçerli bir e-posta adresi gir.");
      return;
    }

    try {
      setLoading(true);

      // 3. Supabase Şifre Sıfırlama İsteği
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      // 4. Kayıtlı Olmayan Kullanıcı / Hata Durumu
      if (error) {
        Alert.alert(
          "İşlem Başarısız",
          error.message.includes("User not found")
            ? "Bu e-posta adresine ait kayıtlı bir hesap bulunamadı."
            : error.message
        );
        return;
      }

      // 5. Başarılı Durumda Yönlendirme
      router.push({
        pathname: "/email-sent",
        params: {
          email: trimmedEmail,
        },
      });
    } catch {
      Alert.alert("Hata", "Bağlantı sağlanamadı. Lütfen tekrar deneyiniz.");
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
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>

            <Text style={styles.title}>Şifreni{"\n"}sıfırla</Text>

            <Text style={styles.description}>
              Hesabına bağlı e-posta adresini gir. Sana güvenli bir sıfırlama
              bağlantısı gönderelim.
            </Text>

            <Text style={styles.label}>E-POSTA</Text>

            <View
              style={[
                styles.inputContainer,
                emailError ? styles.inputContainerError : null,
              ]}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />

              <TextInput
                value={email}
                onChangeText={(value) => {
                  setEmail(value);

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder="ornek@eposta.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={handleSendLink}
              />
            </View>

            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <Pressable
              disabled={loading}
              onPress={handleSendLink}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && !loading ? styles.buttonPressed : null,
                loading ? styles.buttonDisabled : null,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.sendButtonText}>Bağlantı gönder</Text>
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
  },
  title: {
    marginTop: 58,
    color: "#14171A",
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
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

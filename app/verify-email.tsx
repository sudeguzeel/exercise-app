import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { resendVerificationEmail } from "@/services/auth/mock-email-verification";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAIL_APP_URL = "mailto:";

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{
    email?: string | string[];
  }>();

  const emailParam = Array.isArray(email) ? email[0] : email;
  const normalizedEmail = emailParam?.trim() ?? "";
  const displayedEmail = EMAIL_PATTERN.test(normalizedEmail)
    ? normalizedEmail
    : null;
  const [openingMail, setOpeningMail] = useState(false);
  const [resending, setResending] = useState(false);
  const openMailInProgressRef = useRef(false);
  const resendInProgressRef = useRef(false);

  const handleOpenEmail = async () => {
    if (openMailInProgressRef.current) {
      return;
    }

    openMailInProgressRef.current = true;

    try {
      setOpeningMail(true);

      const canOpenMailApp = await Linking.canOpenURL(MAIL_APP_URL);

      if (!canOpenMailApp) {
        throw new Error("Mail app is unavailable");
      }

      await Linking.openURL(MAIL_APP_URL);
    } catch {
      Alert.alert(
        "E-posta uygulaması açılamadı",
        "Cihazında kullanılabilir bir e-posta uygulaması bulunamadı.",
      );
    } finally {
      openMailInProgressRef.current = false;
      setOpeningMail(false);
    }
  };

  const handleResend = async () => {
    if (resendInProgressRef.current) {
      return;
    }

    if (!displayedEmail) {
      Alert.alert(
        "E-posta adresi bulunamadı",
        "Kayıt ekranına dönerek e-posta adresini yeniden girebilirsin.",
      );
      return;
    }

    resendInProgressRef.current = true;

    try {
      setResending(true);

      const result = await resendVerificationEmail(displayedEmail);

      if (!result.success) {
        throw new Error(result.reason);
      }

      Alert.alert(
        "İstek tamamlandı",
        "Doğrulama e-postası yeniden gönderme isteği tamamlandı.",
      );
    } catch {
      Alert.alert(
        "Tekrar gönderilemedi",
        "Doğrulama e-postası yeniden gönderilemedi. Lütfen tekrar dene.",
      );
    } finally {
      resendInProgressRef.current = false;
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    router.replace({
      pathname: "/register",
      params: displayedEmail ? { email: displayedEmail } : {},
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={54} color="#65A900" />
            </View>

            <Text style={styles.title}>E-postanı doğrula</Text>

            <Text style={styles.description}>
              {displayedEmail ? (
                <>
                  <Text style={styles.emailHighlight}>{displayedEmail}</Text>
                  {" adresine doğrulama bağlantısı gönderdik.\n"}
                  Hesabını kullanmaya devam etmek için e-postandaki bağlantıya
                  dokun.
                </>
              ) : (
                "E-posta adresi bulunamadı. Kayıt ekranına dönerek bilgilerini yeniden kontrol edebilirsin."
              )}
            </Text>

            <Pressable
              disabled={openingMail}
              onPress={handleOpenEmail}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !openingMail ? styles.buttonPressed : null,
                openingMail ? styles.buttonDisabled : null,
              ]}
            >
              {openingMail ? (
                <ActivityIndicator color="#101214" />
              ) : (
                <Text style={styles.primaryButtonText}>E-postayı aç</Text>
              )}
            </Pressable>

            <Pressable
              disabled={resending}
              onPress={handleResend}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !resending ? styles.buttonPressed : null,
                resending ? styles.buttonDisabled : null,
              ]}
            >
              {resending ? (
                <ActivityIndicator color="#74A800" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  Doğrulama mailini tekrar gönder
                </Text>
              )}
            </Pressable>

            <View style={styles.changeEmailRow}>
              <Text style={styles.changeEmailQuestion}>
                E-posta adresin yanlış mı?{" "}
              </Text>

              <Pressable disabled={resending} onPress={handleChangeEmail}>
                <Text style={styles.changeEmailLink}>Değiştir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  iconContainer: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: "#EDF6DC",
  },
  title: {
    marginTop: 30,
    color: "#14171A",
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 16,
    color: "#6C716C",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
  },
  emailHighlight: {
    color: "#6C716C",
    fontWeight: "900",
  },
  primaryButton: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    height: 58,
    marginTop: 34,
    borderRadius: 18,
    backgroundColor: "#95D600",
    shadowColor: "#95D600",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#101214",
    fontSize: 18,
    fontWeight: "900",
  },
  secondaryButton: {
    width: "100%",
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.4)",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#14171A",
    fontSize: 15,
    fontWeight: "900",
  },
  changeEmailRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  changeEmailQuestion: {
    color: "#6C716C",
    fontSize: 15,
  },
  changeEmailLink: {
    color: "#84C900",
    fontSize: 15,
    fontWeight: "900",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

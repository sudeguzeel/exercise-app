import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function EmailSentScreen() {
  const { email } = useLocalSearchParams<{
    email?: string | string[];
  }>();

  const [loading, setLoading] = useState(false);

  const displayedEmail = Array.isArray(email)
    ? email[0]
    : email || "E-posta adresi bulunamadı";

  const handleResend = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      // Şifre sıfırlama API'si hazır olduğunda bu bölüm değiştirilecek.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        "Bağlantı gönderildi",
        `Yeni şifre sıfırlama bağlantısı ${displayedEmail} adresine gönderildi.`,
      );
    } catch {
      Alert.alert(
        "Gönderilemedi",
        "Şifre sıfırlama bağlantısı tekrar gönderilemedi. Lütfen yeniden dene.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={42} color="#74A800" />
        </View>

        <Text style={styles.title}>E-postanı kontrol et</Text>

        <Text style={styles.description}>
          Şifre sıfırlama bağlantısını aşağıdaki e-posta adresine gönderdik.
        </Text>

        <View style={styles.emailContainer}>
          <Ionicons name="mail-outline" size={18} color="#74A800" />

          <Text style={styles.emailText} numberOfLines={1}>
            {displayedEmail}
          </Text>
        </View>

        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={18} color="#6C716C" />

          <Text style={styles.durationText}>
            Bağlantı 3 dakika boyunca geçerlidir.
          </Text>
        </View>

        <Pressable
          onPress={() => router.replace("/login")}
          disabled={loading}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && !loading ? styles.buttonPressed : null,
            loading ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.loginButtonText}>Giriş ekranına dön</Text>
        </Pressable>

        <Pressable
          onPress={handleResend}
          disabled={loading}
          style={({ pressed }) => [
            styles.resendButton,
            pressed && !loading ? styles.buttonPressed : null,
            loading ? styles.buttonDisabled : null,
          ]}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#74A800" />
              <Text style={styles.resendButtonText}>Gönderiliyor...</Text>
            </>
          ) : (
            <>
              <Ionicons name="refresh-outline" size={19} color="#74A800" />
              <Text style={styles.resendButtonText}>Tekrar gönder</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  iconContainer: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
    backgroundColor: "rgba(149, 214, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
  },
  title: {
    marginTop: 28,
    color: "#14171A",
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    marginTop: 14,
    color: "#6C716C",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  emailContainer: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.35)",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  emailText: {
    flexShrink: 1,
    marginLeft: 9,
    color: "#14171A",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  durationText: {
    marginLeft: 7,
    color: "#6C716C",
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    width: "100%",
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 34,
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
  loginButtonText: {
    color: "#101214",
    fontSize: 17,
    fontWeight: "900",
  },
  resendButton: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(116, 168, 0, 0.42)",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  resendButtonText: {
    color: "#74A800",
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

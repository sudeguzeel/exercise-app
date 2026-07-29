import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    try {
      setSigningOut(true);
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
      router.replace("/login");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark-circle" size={40} color="#74A800" />
        </View>

        <Text style={styles.title}>Hoş geldin</Text>

        <Text style={styles.subtitle}>
          {email
            ? `${email} hesabıyla giriş yaptın.`
            : "Hesabına giriş yaptın."}
        </Text>

        <Pressable
          disabled={signingOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && !signingOut ? styles.buttonPressed : null,
            signingOut ? styles.buttonDisabled : null,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color="#101214" />
          ) : (
            <Text style={styles.signOutButtonText}>Çıkış yap</Text>
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
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "rgba(116, 168, 0, 0.12)",
  },
  title: {
    color: "#14171A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 32,
    color: "#6C716C",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  signOutButton: {
    height: 50,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
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
  signOutButtonText: {
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
});

import { loadProfilePersonalInfo } from "@/shared/lib/services/profileService";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#78D600";
const TEXT = "#202320";
const MUTED = "#7C807C";
const BORDER = "#BFE28E";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
};

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([supabase.auth.getUser(), loadProfilePersonalInfo()]).then(
      ([{ data }, profileResult]) => {
        if (!active) return;
        setEmail(data.user?.email ?? "");
        if (profileResult.success) {
          setFullName(profileResult.personalInfo.fullName);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const displayName = useMemo(
    () => getDisplayName(fullName, email),
    [email, fullName],
  );
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch {
      Alert.alert("Çıkış yapılamadı", "Lütfen tekrar deneyin.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email || "E-posta bilgisi bulunamadı"}
            </Text>
          </View>
        </View>

        <SectionLabel>HESAP</SectionLabel>
        <View style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            label="Kişisel bilgilerim"
            onPress={() => router.push("/(main)/profile-personal-info")}
          />
          <MenuItem
            icon="notifications-outline"
            label="Bildirimler"
            isLast
            onPress={() => router.push("/(main)/profile-notifications")}
          />
        </View>

        <SectionLabel>UYGULAMA</SectionLabel>
        <View style={styles.menuCard}>
          <MenuItem
            icon="language-outline"
            label="Dil"
            value="Türkçe"
            onPress={() => router.push("/(main)/profile-language")}
          />
          <MenuItem
            icon="sunny-outline"
            label="Uygulama ayarları"
            onPress={() => router.push("/(main)/profile-app-settings")}
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Gizlilik"
            isLast
            onPress={() => router.push("/(main)/profile-privacy")}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.pressed,
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color="#FF5757" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={21} color="#FF5757" />
              <Text style={styles.signOutText}>Çıkış yap</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  label,
  value,
  isLast = false,
  onPress,
}: MenuItemProps & { isLast?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && styles.menuRowBorder,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={GREEN} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={MUTED} />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function getDisplayName(fullName: string, email: string) {
  const normalizedName = fullName.trim();
  if (normalizedName) return normalizedName;
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return "Kullanıcı";
  const words = localPart.split(/[._-]+/).filter(Boolean);
  if (words.length === 0) return "Kullanıcı";
  return words
    .map((word) => word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toLocaleUpperCase(
      "tr-TR",
    );
  }
  return name.slice(0, 2).toLocaleUpperCase("tr-TR");
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9F4" },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 28 },
  identityRow: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF6D7",
  },
  avatarText: { color: GREEN, fontSize: 27, fontWeight: "900" },
  identityText: { flex: 1, marginLeft: 18 },
  name: { color: TEXT, fontSize: 20, fontWeight: "800" },
  email: { marginTop: 5, color: MUTED, fontSize: 15 },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 10,
    marginLeft: 2,
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },
  menuCard: {
    marginBottom: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  menuRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuLabel: { flex: 1, marginLeft: 14, color: TEXT, fontSize: 16 },
  menuValue: { marginRight: 12, color: MUTED, fontSize: 14 },
  signOutButton: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },
  signOutText: { marginLeft: 14, color: "#FF5757", fontSize: 16 },
  pressed: { opacity: 0.65 },
});

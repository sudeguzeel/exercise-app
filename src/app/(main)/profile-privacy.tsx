import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_ITEMS = [
  { icon: "document-text-outline", label: "Gizlilik Politikası" },
  { icon: "reader-outline", label: "Kullanım Koşulları" },
  { icon: "download-outline", label: "Verilerini İndir" },
  { icon: "trash-outline", label: "Hesabı Sil", danger: true },
] as const;

export default function ProfilePrivacyScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [deleting, setDeleting] = useState(false);
  const soon = (label: string) => Alert.alert(label, "Bu özellik yakında kullanıma açılacak.");

  const deleteAccount = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Hata", "Oturum bulunamadı. Lütfen tekrar giriş yap.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error || (data as { error?: string } | null)?.error) {
        Alert.alert("Hesap silinemedi", "Lütfen tekrar dene.");
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      Alert.alert("Hesap silinemedi", "Lütfen tekrar dene.");
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    const message = "Bu işlem geri alınamaz. Hesabın ve tüm verilerin kalıcı olarak silinecek.";
    if (Platform.OS === "web") {
      if (globalThis.confirm(`Hesabını silmek istediğine emin misin?\n\n${message}`)) void deleteAccount();
      return;
    }
    Alert.alert("Hesabını silmek istediğine emin misin?", message, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Hesabımı sil", style: "destructive", onPress: () => void deleteAccount() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Profile dön" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Gizlilik ve Güvenlik</Text>
          <View style={styles.headerSpacer} />
        </View>

        <SectionLabel>GÜVENLİK</SectionLabel>
        <View style={styles.card}>
          <PrivacyRow icon="key-outline" label="Şifreyi değiştir" onPress={() => router.push("/(main)/profile-change-password")} />
        </View>

        <SectionLabel>GİZLİLİK VE VERİLER</SectionLabel>
        <View style={styles.card}>
          {PRIVACY_ITEMS.map((item, index) => {
            const isDelete = item.label === "Hesabı Sil";
            return (
              <PrivacyRow
                key={item.label}
                {...item}
                disabled={isDelete && deleting}
                isLast={index === PRIVACY_ITEMS.length - 1}
                loading={isDelete && deleting}
                onPress={isDelete ? confirmDeleteAccount : () => soon(item.label)}
              />
            );
          })}
        </View>

        <View style={styles.warning}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <Text style={styles.warningText}>Hesap silme işlemi geri alınamaz. Silme işleminden önce mutlaka emin ol.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function PrivacyRow({ icon, label, danger = false, isLast = true, disabled = false, loading = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; isLast?: boolean; disabled?: boolean; loading?: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = danger ? colors.error : colors.primary;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.pressed, disabled && styles.disabled]}>
      <Ionicons name={icon} size={21} color={color} />
      <Text style={[styles.rowLabel, danger && { color }]}>{label}</Text>
      {loading ? <ActivityIndicator color={colors.error} /> : <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  headerSpacer: { width: 42 },
  sectionLabel: { marginLeft: 2, marginBottom: 10, color: colors.textSecondary, fontSize: 13, fontWeight: "800" },
  card: { overflow: "hidden", marginBottom: 28, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowLabel: { flex: 1, marginLeft: 14, color: colors.text, fontSize: 16 },
  warning: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.primarySoft },
  warningText: { flex: 1, marginLeft: 12, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.6 },
});

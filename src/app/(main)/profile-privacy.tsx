import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIVACY_ITEMS = [
  { id: "privacyPolicy", icon: "document-text-outline" },
  { id: "termsOfUse", icon: "reader-outline" },
  { id: "downloadData", icon: "download-outline" },
  { id: "deleteAccount", icon: "trash-outline", danger: true },
] as const;

export default function ProfilePrivacyScreen() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [deleting, setDeleting] = useState(false);
  const soon = (label: string) => Alert.alert(label, t("profilePrivacy.comingSoon"));

  const deleteAccount = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(t("profilePrivacy.sessionErrorTitle"), t("profilePrivacy.sessionErrorMessage"));
        return;
      }
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error || (data as { error?: string } | null)?.error) {
        Alert.alert(t("profilePrivacy.deleteFailedTitle"), t("profilePrivacy.deleteFailedMessage"));
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login");
    } catch {
      Alert.alert(t("profilePrivacy.deleteFailedTitle"), t("profilePrivacy.deleteFailedMessage"));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (deleting) return;
    const message = t("profilePrivacy.deleteConfirmMessage");
    if (Platform.OS === "web") {
      if (globalThis.confirm(`${t("profilePrivacy.webDeleteConfirmPrefix")}\n\n${message}`)) void deleteAccount();
      return;
    }
    Alert.alert(t("profilePrivacy.deleteConfirmTitle"), message, [
      { text: t("profilePrivacy.cancel"), style: "cancel" },
      { text: t("profilePrivacy.confirmDelete"), style: "destructive", onPress: () => void deleteAccount() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel={t("profilePrivacy.backAccessibility")} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("profilePrivacy.headerTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionLabel>{t("profilePrivacy.sectionSecurity")}</SectionLabel>
        <View style={styles.card}>
          <PrivacyRow icon="key-outline" label={t("profilePrivacy.changePassword")} onPress={() => router.push("/(main)/profile-change-password")} />
        </View>

        <SectionLabel>{t("profilePrivacy.sectionPrivacyData")}</SectionLabel>
        <View style={styles.card}>
          {PRIVACY_ITEMS.map((item, index) => {
            const isDelete = item.id === "deleteAccount";
            const label = t(`profilePrivacy.${item.id}`);
            return (
              <PrivacyRow
                key={item.id}
                icon={item.icon}
                danger={"danger" in item ? item.danger : false}
                label={label}
                disabled={isDelete && deleting}
                isLast={index === PRIVACY_ITEMS.length - 1}
                loading={isDelete && deleting}
                onPress={isDelete ? confirmDeleteAccount : () => soon(label)}
              />
            );
          })}
        </View>

        <View style={styles.warning}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
          <Text style={styles.warningText}>{t("profilePrivacy.warningText")}</Text>
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
  content: { paddingHorizontal: 20, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, backgroundColor: colors.background, zIndex: 10 },
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

import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { supabase } from "@/shared/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PasswordField = "current" | "next" | "repeat";

export default function ProfileChangePasswordScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({ current: false, next: false, repeat: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleVisible = (field: PasswordField) => setVisible((value) => ({ ...value, [field]: !value[field] }));

  const updatePassword = async () => {
    if (submitting) return;
    setError("");
    if (!currentPassword || !newPassword || !repeatPassword) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPassword !== repeatPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Yeni şifre mevcut şifreyle aynı olmamalı.");
      return;
    }
    if (newPassword.length < 8 || !/\p{L}/u.test(newPassword) || !/\d/.test(newPassword)) {
      setError("Yeni şifre en az 8 karakter, bir harf ve bir rakam içermelidir.");
      return;
    }

    setSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setError("Oturum bilgisi bulunamadı.");
      setSubmitting(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) {
      setError("Mevcut şifre yanlış.");
      setSubmitting(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);
    if (updateError) {
      setError("Şifre güncellenemedi. Lütfen tekrar deneyin.");
      return;
    }
    setSuccess("Şifren başarıyla güncellendi.");
    setTimeout(() => router.back(), 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>
            <Text style={styles.headerTitle}>Şifreyi değiştir</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.card}>
            <PasswordInput label="Mevcut şifre" value={currentPassword} visible={visible.current} onChangeText={setCurrentPassword} onToggle={() => toggleVisible("current")} />
            <PasswordInput label="Yeni şifre" value={newPassword} visible={visible.next} onChangeText={setNewPassword} onToggle={() => toggleVisible("next")} />
            <PasswordInput label="Yeni şifreyi tekrar gir" value={repeatPassword} visible={visible.repeat} onChangeText={setRepeatPassword} onToggle={() => toggleVisible("repeat")} />
            <View style={styles.infoRow}><Ionicons name="information-circle-outline" size={18} color={colors.primary} /><Text style={styles.infoText}>En az 8 karakter; bir harf ve bir rakam içermelidir.</Text></View>
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
            {success ? <Text accessibilityLiveRegion="polite" style={styles.success}>{success}</Text> : null}
          </View>

          <Pressable disabled={submitting || Boolean(success)} onPress={() => void updatePassword()} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, (submitting || Boolean(success)) && styles.disabled]}>
            {submitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.submitText}>Şifreyi güncelle</Text>}
          </Pressable>
          <Pressable onPress={() => router.push("/forgot-password")} style={styles.forgotButton}><Text style={styles.forgotText}>Şifreni mi unuttun?</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordInput({ label, value, visible, onChangeText, onToggle }: { label: string; value: string; visible: boolean; onChangeText: (value: string) => void; onToggle: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><TextInput autoCapitalize="none" autoCorrect={false} onChangeText={onChangeText} secureTextEntry={!visible} style={styles.input} value={value} /><Pressable accessibilityLabel={visible ? "Şifreyi gizle" : "Şifreyi göster"} onPress={onToggle} style={styles.eyeButton}><Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={21} color={colors.textSecondary} /></Pressable></View></View>;
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 30 },
  backButton: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: "900" }, headerSpacer: { width: 42 },
  card: { padding: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface },
  field: { marginBottom: 18 }, label: { marginBottom: 8, color: colors.text, fontSize: 13, fontWeight: "800" },
  inputRow: { height: 52, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.inputBackground },
  input: { flex: 1, height: "100%", paddingHorizontal: 14, color: colors.text, fontSize: 16 }, eyeButton: { width: 48, height: "100%", alignItems: "center", justifyContent: "center" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", padding: 12, borderRadius: 12, backgroundColor: colors.primarySoft },
  infoText: { flex: 1, marginLeft: 8, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  error: { marginTop: 14, color: colors.error, fontSize: 13, fontWeight: "700" }, success: { marginTop: 14, color: colors.primary, fontSize: 14, fontWeight: "800" },
  submitButton: { height: 54, marginTop: 18, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.primary },
  submitText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
  forgotButton: { alignSelf: "center", padding: 14 }, forgotText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.7 }, disabled: { opacity: 0.55 },
});

import type { PersonalInfo } from "@/providers/OnboardingContext";
import { useOnboarding } from "@/providers/OnboardingContext";
import {
  loadProfilePersonalInfo,
  saveProfilePersonalInfo,
} from "@/shared/lib/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
const EMPTY: PersonalInfo = {
  fullName: "", gender: "", birthDate: "", height: "",
  currentWeight: "", targetWeight: "", goal: "",
};

export default function ProfilePersonalInfoScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { setPersonalInfo } = useOnboarding();
  const [form, setForm] = useState<PersonalInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    void loadProfilePersonalInfo().then((result) => {
      if (!active) return;
      if (result.success) setForm(result.personalInfo);
      else setLoadError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const update = (field: keyof PersonalInfo, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const chooseGender = () => Alert.alert("Cinsiyet", "Seçiminizi yapın.", [
    { text: "Kadın", onPress: () => update("gender", "female") },
    { text: "Erkek", onPress: () => update("gender", "male") },
    { text: "Belirtmek istemiyorum", onPress: () => update("gender", "other") },
    { text: "Vazgeç", style: "cancel" },
  ]);

  const chooseGoal = () => Alert.alert("Fitness Hedefi", "Seçiminizi yapın.", [
    { text: "Kas Kazanımı", onPress: () => update("goal", "build-muscle") },
    { text: "Yağ Yakımı", onPress: () => update("goal", "lose-weight") },
    { text: "Genel Fitness", onPress: () => update("goal", "stay-fit") },
    { text: "Vazgeç", style: "cancel" },
  ]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const result = await saveProfilePersonalInfo(form);
    setSaving(false);
    if (!result.success) {
      Alert.alert("Kaydedilemedi", result.message);
      return;
    }
    setPersonalInfo(form);
    Alert.alert("Kaydedildi", "Kişisel bilgileriniz güncellendi.");
  };

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Header title="Kişisel Bilgilerim" />
          <View style={styles.introRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>P</Text></View>
            <Text style={styles.introText}>Bilgilerini güncel tutmak, sana daha iyi bir deneyim sunmamıza yardımcı olur.</Text>
          </View>

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

          <View style={styles.formCard}>
            <Field icon="person-outline" label="Ad Soyad" value={form.fullName} onChangeText={(v) => update("fullName", v)} />
            <Field icon="calendar-outline" label="Doğum Tarihi" value={form.birthDate} placeholder="GG/AA/YYYY" keyboardType="number-pad" onChangeText={(v) => update("birthDate", v)} />
            <SelectField icon="person-outline" label="Cinsiyet" value={genderLabel(form.gender)} onPress={chooseGender} />
            <View style={styles.doubleRow}>
              <View style={styles.half}><Field icon="resize-outline" label="Boy (cm)" value={form.height} keyboardType="decimal-pad" onChangeText={(v) => update("height", v)} /></View>
              <View style={styles.half}><Field icon="scale-outline" label="Mevcut Kilo (kg)" value={form.currentWeight} keyboardType="decimal-pad" onChangeText={(v) => update("currentWeight", v)} /></View>
            </View>
            <Field icon="locate-outline" label="Hedef Kilo (kg)" value={form.targetWeight} keyboardType="decimal-pad" onChangeText={(v) => update("targetWeight", v)} />
            <SelectField icon="trophy-outline" label="Fitness Hedefi" value={goalLabel(form.goal)} onPress={chooseGoal} />
          </View>

          <Pressable disabled={saving || Boolean(loadError)} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, (saving || Boolean(loadError)) && styles.disabled]}>
            {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>Kaydet</Text>}
          </Pressable>
          <View style={styles.privateNote}><Ionicons name="lock-closed-outline" size={16} color={colors.primary} /><Text style={styles.privateText}>Bilgilerin sadece senin tarafından görülebilir ve güvenle saklanır.</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.header}><Pressable onPress={() => router.replace("/(main)/profile")} style={styles.back}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={styles.headerSpacer} /></View>;
}

type FieldProps = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; placeholder?: string; keyboardType?: "default" | "number-pad" | "decimal-pad"; onChangeText: (value: string) => void };
function Field({ icon, label, ...inputProps }: FieldProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.fieldRow}><Ionicons name={icon} size={20} color={colors.primary} /><View style={styles.fieldContent}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} placeholderTextColor={colors.placeholder} style={styles.input} /></View></View>;
}
function SelectField({ icon, label, value, onPress }: Omit<FieldProps, "onChangeText"> & { onPress: () => void }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <View style={styles.fieldRow}><Ionicons name={icon} size={20} color={colors.primary} /><View style={styles.fieldContent}><Text style={styles.label}>{label}</Text><Pressable onPress={onPress} style={styles.select}><Text style={styles.selectText}>{value || "Seçiniz"}</Text><Ionicons name="chevron-down" size={18} color={colors.primary} /></Pressable></View></View>;
}
const genderLabel = (v: PersonalInfo["gender"]) => v === "female" ? "Kadın" : v === "male" ? "Erkek" : v === "other" ? "Belirtmek istemiyorum" : "";
const goalLabel = (v: PersonalInfo["goal"]) => v === "build-muscle" ? "Kas Kazanımı" : v === "lose-weight" ? "Yağ Yakımı" : v === "stay-fit" ? "Genel Fitness" : "";

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  back: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerTitle: { color: colors.text, fontSize: 19, fontWeight: "900" }, headerSpacer: { width: 38 },
  introRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primary, fontSize: 27, fontWeight: "900" }, introText: { flex: 1, marginLeft: 16, color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  formCard: { padding: 16, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 20, backgroundColor: colors.surface },
  fieldRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 }, fieldContent: { flex: 1, marginLeft: 12 }, label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: "700" },
  input: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, color: colors.text, backgroundColor: colors.inputBackground },
  select: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.inputBackground }, selectText: { color: colors.text, fontSize: 14 },
  doubleRow: { flexDirection: "row", gap: 10 }, half: { flex: 1 },
  saveButton: { height: 50, marginTop: 12, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }, saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
  privateNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, paddingHorizontal: 18 }, privateText: { flexShrink: 1, marginLeft: 9, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  errorText: { marginBottom: 12, color: colors.error, fontSize: 13, textAlign: "center" }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.55 },
});

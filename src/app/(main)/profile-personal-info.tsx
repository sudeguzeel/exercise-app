import { useAppTheme } from "@/providers/AppThemeContext";
import type { PersonalInfo } from "@/providers/OnboardingContext";
import { useOnboarding } from "@/providers/OnboardingContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import {
  loadProfilePersonalInfo,
  saveProfilePersonalInfo,
} from "@/shared/lib/services/profileService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const EMPTY: PersonalInfo = {
  fullName: "", gender: "", birthDate: "", height: "",
  currentWeight: "", targetWeight: "", goal: "",
};

type SelectionType = "gender" | "goal";
type PhotoTransform = { x: number; y: number; scale: number };
const PROFILE_IMAGE_STORAGE_KEY = "profile-image-data-uri";
const PROFILE_IMAGE_TRANSFORM_KEY = "profile-image-transform";
const PROFILE_EDITOR_SIZE = 280;

export default function ProfilePersonalInfoScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const goalsOnly = section === "goals";
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { setPersonalInfo } = useOnboarding();
  const [form, setForm] = useState<PersonalInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectionType, setSelectionType] = useState<SelectionType | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [photoTransform, setPhotoTransform] = useState<PhotoTransform>({ x: 0, y: 0, scale: 1 });

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

  useEffect(() => {
    let active = true;
    void Promise.all([
      AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY),
      AsyncStorage.getItem(PROFILE_IMAGE_TRANSFORM_KEY),
    ]).then(([storedImage, storedTransform]) => {
      if (!active) return;
      setProfileImage(storedImage);
      if (storedTransform) setPhotoTransform(JSON.parse(storedTransform));
    });
    return () => { active = false; };
  }, []);

  const update = (field: keyof PersonalInfo, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const chooseGender = () => setSelectionType("gender");
  const chooseGoal = () => setSelectionType("goal");

  const selectionOptions = selectionType === "gender"
    ? [
        { label: "Kadın", value: "female" },
        { label: "Erkek", value: "male" },
        { label: "Cinsiyet belirtmek istemiyorum", value: "other" },
      ]
    : [
        { label: "Kas Kazanımı", value: "build-muscle" },
        { label: "Yağ Yakımı", value: "lose-weight" },
        { label: "Genel Fitness", value: "stay-fit" },
      ];

  const selectOption = (value: string) => {
    if (selectionType === "gender") update("gender", value);
    if (selectionType === "goal") update("goal", value);
    setSelectionType(null);
  };

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
          <Header title={goalsOnly ? "Hedeflerim" : "Kişisel Bilgilerim"} />
         <View style={styles.introRow}>
            <View style={styles.avatar}>
              {profileImage ? (
           <Image
               resizeMode="cover"
                source={{ uri: profileImage }}
             style={[
            styles.avatarImage,
         {
          transform: [
         { translateX: photoTransform.x * (66 / PROFILE_EDITOR_SIZE) },
         { translateY: photoTransform.y * (66 / PROFILE_EDITOR_SIZE) },
         { scale: photoTransform.scale },
        ],
       },
      ]}
     />
    ) : (
      <Image
        source={
          isDark
            ? require("../../../assets/images/fitrehber_dark_profil_icon_sn.png")
            : require("../../../assets/images/fitrehber_light_profil_icon_sn_1.png")
        }
        resizeMode="contain"
        style={styles.defaultAvatarImage}
      />
    )}
  </View>

  <View style={styles.introContent}>
    <Text style={styles.userName}>{form.fullName || "Sporcu"}</Text>

    <Text style={styles.introText}>
      {goalsOnly
        ? "Fitness ve kilo hedeflerini buradan güncelleyebilirsin."
        : "Bilgilerini güncel tutmak, sana daha iyi bir deneyim sunmamıza yardımcı olur."}
    </Text>
  </View>
</View>

          {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

          <View style={styles.formCard}>
            {goalsOnly ? (
              <>
                <Field icon="locate-outline" label="Hedef Kilo (kg)" value={form.targetWeight} keyboardType="decimal-pad" onChangeText={(v) => update("targetWeight", v)} />
                <SelectField icon="trophy-outline" label="Fitness Hedefi" value={goalLabel(form.goal)} onPress={chooseGoal} />
              </>
            ) : (
              <>
            <Field icon="person-outline" label="Ad Soyad" value={form.fullName} onChangeText={(v) => update("fullName", v)} />
            <Field icon="calendar-outline" label="Doğum Tarihi" value={form.birthDate} placeholder="GG/AA/YYYY" keyboardType="number-pad" onChangeText={(v) => update("birthDate", v)} />
            <SelectField icon="person-outline" label="Cinsiyet" value={genderLabel(form.gender)} onPress={chooseGender} />
            <View style={styles.doubleRow}>
              <View style={styles.half}><Field icon="resize-outline" label="Boy (cm)" value={form.height} keyboardType="decimal-pad" onChangeText={(v) => update("height", v)} /></View>
              <View style={styles.half}><Field icon="scale-outline" label="Mevcut Kilo (kg)" value={form.currentWeight} keyboardType="decimal-pad" onChangeText={(v) => update("currentWeight", v)} /></View>
            </View>
            <Field icon="locate-outline" label="Hedef Kilo (kg)" value={form.targetWeight} keyboardType="decimal-pad" onChangeText={(v) => update("targetWeight", v)} />
            <SelectField icon="trophy-outline" label="Fitness Hedefi" value={goalLabel(form.goal)} onPress={chooseGoal} />
              </>
            )}
          </View>

          <Pressable disabled={saving || Boolean(loadError)} onPress={() => void handleSave()} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, (saving || Boolean(loadError)) && styles.disabled]}>
            {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveText}>Kaydet</Text>}
          </Pressable>
          <View style={styles.privateNote}><Ionicons name="lock-closed-outline" size={16} color={colors.primary} /><Text style={styles.privateText}>Bilgilerin sadece senin tarafından görülebilir ve güvenle saklanır.</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal transparent animationType="fade" visible={selectionType !== null} onRequestClose={() => setSelectionType(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectionType(null)}>
          <Pressable style={styles.selectionSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.selectionTitle}>{selectionType === "gender" ? "Cinsiyet" : "Fitness Hedefi"}</Text>
            {selectionOptions.map((option) => {
              const selected = selectionType === "gender" ? form.gender === option.value : form.goal === option.value;
              return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => selectOption(option.value)} style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}><Text style={styles.optionText}>{option.label}</Text><Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={22} color={colors.primary} /></Pressable>;
            })}
            <Pressable onPress={() => setSelectionType(null)} style={styles.cancelSelection}><Text style={styles.cancelSelectionText}>İptal</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  avatar: { width: 66, height: 66, overflow: "hidden", borderRadius: 33, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  avatarImage: { width: 66, height: 66, borderRadius: 33 },
  defaultAvatarImage: {
  width: 62,
  height: 62,
  borderRadius: 31,
},
  introContent: {
  flex: 1,
  marginLeft: 16,
},

userName: {
  marginBottom: 4,
  color: colors.text,
  fontSize: 16,
  fontWeight: "800",
},

introText: {
  color: colors.textSecondary,
  fontSize: 13,
  lineHeight: 19,
},
  formCard: { padding: 16, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 20, backgroundColor: colors.surface },
  fieldRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 }, fieldContent: { flex: 1, marginLeft: 12 }, label: { marginBottom: 6, color: colors.text, fontSize: 12, fontWeight: "700" },
  input: { height: 42, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, color: colors.text, backgroundColor: colors.inputBackground },
  select: { height: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 11, backgroundColor: colors.inputBackground }, selectText: { color: colors.text, fontSize: 14 },
  doubleRow: { flexDirection: "row", gap: 10 }, half: { flex: 1 },
  saveButton: { height: 50, marginTop: 12, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary }, saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
  privateNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16, paddingHorizontal: 18 }, privateText: { flexShrink: 1, marginLeft: 9, color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  errorText: { marginBottom: 12, color: colors.error, fontSize: 13, textAlign: "center" }, pressed: { opacity: 0.72 }, disabled: { opacity: 0.55 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", padding: 18, backgroundColor: colors.overlay },
  selectionSheet: { padding: 18, borderRadius: 22, backgroundColor: colors.surface },
  selectionTitle: { marginBottom: 8, color: colors.text, fontSize: 19, fontWeight: "900" },
  optionRow: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  optionText: { color: colors.text, fontSize: 16 },
  cancelSelection: { height: 48, marginTop: 12, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: colors.surfaceElevated },
  cancelSelectionText: { color: colors.text, fontSize: 15, fontWeight: "800" },
});

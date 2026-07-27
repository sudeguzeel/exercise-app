import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { Gender, Goal, useOnboarding } from "@/context/OnboardingContext";

const GREEN = "#79DE2D";
const BACKGROUND = "#F7F8F2";
const BORDER = "#BFDDA9";
const TEXT = "#1C1C1C";
const MUTED = "#666A64";
const ERROR = "#D94B4B";

const genderOptions: {
  label: string;
  value: Gender;
}[] = [
  {
    label: "Erkek",
    value: "male",
  },
  {
    label: "Kadın",
    value: "female",
  },
  {
    label: "Belirtmek\nistemiyorum",
    value: "other",
  },
];

const goalOptions: {
  label: string;
  value: Goal;
}[] = [
  {
    label: "Kas\nkazanımı",
    value: "build-muscle",
  },
  {
    label: "Yağ\nyakımı",
    value: "lose-weight",
  },
  {
    label: "Genel\nfitness",
    value: "stay-fit",
  },
];

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatBirthDateInput(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 8);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 4) {
    return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  }

  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
}

function parseBirthDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null;
  }

  const [dayText, monthText, yearText] = value.split("/");

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function calculateAge(date: Date) {
  const today = new Date();

  let age = today.getFullYear() - date.getFullYear();

  const monthDifference = today.getMonth() - date.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < date.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatWeightInput(value: string) {
  const cleanedValue = value.replace(",", ".").replace(/[^0-9.]/g, "");

  const parts = cleanedValue.split(".");

  if (parts.length <= 1) {
    return cleanedValue.slice(0, 3);
  }

  return `${parts[0].slice(0, 3)}.${parts.slice(1).join("").slice(0, 1)}`;
}

export default function PersonalInfoScreen() {
  const { personalInfo, setPersonalInfo } = useOnboarding();

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [touched, setTouched] = useState({
    fullName: false,
    birthDate: false,
    height: false,
    currentWeight: false,
    targetWeight: false,
  });

  const selectedDate =
    parseBirthDate(personalInfo.birthDate) ?? new Date(2000, 0, 1, 12, 0, 0, 0);

  const fullNameError = useMemo(() => {
    const value = personalInfo.fullName.trim();

    if (!value) {
      return "Ad Soyad alanı zorunludur.";
    }

    const pattern =
      /^[A-Za-zÇĞİÖŞÜçğıöşüÀ-ž]+(?:[ '-][A-Za-zÇĞİÖŞÜçğıöşüÀ-ž]+)*$/;

    if (!pattern.test(value)) {
      return "Yalnızca harf, boşluk, tire ve apostrof kullanılabilir.";
    }

    return "";
  }, [personalInfo.fullName]);

  const birthDateError = useMemo(() => {
    if (!personalInfo.birthDate) {
      return "Doğum tarihi zorunludur.";
    }

    if (personalInfo.birthDate.length !== 10) {
      return "Tarihi GG/AA/YYYY biçiminde giriniz.";
    }

    const date = parseBirthDate(personalInfo.birthDate);

    if (!date) {
      return "Geçerli bir doğum tarihi giriniz.";
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (date > today) {
      return "Gelecek tarih kabul edilmez.";
    }

    if (calculateAge(date) < 13) {
      return "En az 13 yaşında olmalısınız.";
    }

    return "";
  }, [personalInfo.birthDate]);

  const heightError = useMemo(() => {
    if (!personalInfo.height) {
      return "Boy alanı zorunludur.";
    }

    const value = Number(personalInfo.height);

    if (!Number.isInteger(value) || value < 100 || value > 250) {
      return "Boy 100–250 cm arasında tam sayı olmalıdır.";
    }

    return "";
  }, [personalInfo.height]);

  const currentWeightError = useMemo(() => {
    if (!personalInfo.currentWeight) {
      return "Mevcut kilo zorunludur.";
    }

    const value = Number(personalInfo.currentWeight);

    if (Number.isNaN(value) || value < 30 || value > 300) {
      return "Mevcut kilo 30–300 kg arasında olmalıdır.";
    }

    return "";
  }, [personalInfo.currentWeight]);

  const targetWeightError = useMemo(() => {
    if (!personalInfo.targetWeight) {
      return "Hedef kilo zorunludur.";
    }

    const value = Number(personalInfo.targetWeight);

    if (Number.isNaN(value) || value < 30 || value > 300) {
      return "Hedef kilo 30–300 kg arasında olmalıdır.";
    }

    return "";
  }, [personalInfo.targetWeight]);

  const isFormValid =
    personalInfo.gender !== "" &&
    personalInfo.goal !== "" &&
    !fullNameError &&
    !birthDateError &&
    !heightError &&
    !currentWeightError &&
    !targetWeightError;

  const updateField = (field: keyof typeof personalInfo, value: string) => {
    setPersonalInfo((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleFullNameChange = (value: string) => {
    const cleanedValue = value.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÀ-ž\s'-]/g, "");

    updateField("fullName", cleanedValue);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !date) {
      return;
    }

    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      12,
      0,
      0,
      0,
    );

    updateField("birthDate", formatDate(normalizedDate));

    setTouched((previous) => ({
      ...previous,
      birthDate: true,
    }));
  };

  const handleContinue = async () => {
    if (!isFormValid || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      router.push("/onboarding/fitness-experience");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </Pressable>

          <Text style={styles.stepText}>
            Adım <Text style={styles.activeStep}>2</Text> / 4
          </Text>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressItem, styles.progressActive]} />
          <View style={[styles.progressItem, styles.progressActive]} />
          <View style={styles.progressItem} />
          <View style={styles.progressItem} />
        </View>

        <Text style={styles.title}>Seni tanıyalım</Text>

        <Text style={styles.subtitle}>
          Programını buna göre kişiselleştireceğiz.
        </Text>

        <Text style={styles.sectionLabel}>CİNSİYET</Text>

        <View style={styles.optionRow}>
          {genderOptions.map((option) => {
            const selected = personalInfo.gender === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => updateField("gender", option.value)}
                style={[styles.genderCard, selected && styles.selectedCard]}
              >
                <View
                  style={[styles.radioOuter, selected && styles.radioSelected]}
                >
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>

                <Text
                  style={[styles.optionText, selected && styles.selectedText]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>HEDEFİN</Text>

        <View style={styles.optionRow}>
          {goalOptions.map((option) => {
            const selected = personalInfo.goal === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => updateField("goal", option.value)}
                style={[styles.goalCard, selected && styles.selectedCard]}
              >
                <Text
                  style={[styles.optionText, selected && styles.selectedText]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>AD SOYAD / DOĞUM TARİHİ</Text>

        <View style={styles.doubleRow}>
          <View style={styles.halfField}>
            <TextInput
              value={personalInfo.fullName}
              onChangeText={handleFullNameChange}
              onBlur={() =>
                setTouched((previous) => ({
                  ...previous,
                  fullName: true,
                }))
              }
              placeholder="Ad Soyad"
              placeholderTextColor="#777B76"
              autoCapitalize="words"
              maxLength={50}
              style={[
                styles.input,
                touched.fullName && fullNameError
                  ? styles.inputError
                  : undefined,
              ]}
            />

            {touched.fullName && fullNameError ? (
              <Text style={styles.errorText}>{fullNameError}</Text>
            ) : null}
          </View>

          <View style={styles.halfField}>
            <View style={styles.dateFieldRow}>
              <TextInput
                value={personalInfo.birthDate}
                onChangeText={(value) =>
                  updateField("birthDate", formatBirthDateInput(value))
                }
                onBlur={() =>
                  setTouched((previous) => ({
                    ...previous,
                    birthDate: true,
                  }))
                }
                placeholder="GG/AA/YYYY"
                placeholderTextColor="#777B76"
                keyboardType="number-pad"
                maxLength={10}
                style={[
                  styles.dateTextInput,
                  touched.birthDate && birthDateError
                    ? styles.inputError
                    : undefined,
                ]}
              />

              <Pressable
                style={styles.calendarButton}
                onPress={() => {
                  setTouched((previous) => ({
                    ...previous,
                    birthDate: true,
                  }));

                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={19} color={TEXT} />
              </Pressable>
            </View>

            {touched.birthDate && birthDateError ? (
              <Text style={styles.errorText}>{birthDateError}</Text>
            ) : null}
          </View>
        </View>

        {showDatePicker ? (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={handleDateChange}
              themeVariant="light"
              textColor="#111111"
              accentColor={GREEN}
              locale="tr-TR"
            />

            {Platform.OS === "ios" ? (
              <Pressable
                style={styles.datePickerDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerDoneText}>Tamam</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>BOY / MEVCUT KİLO / HEDEF KİLO</Text>

        <View style={styles.tripleRow}>
          <View style={styles.smallField}>
            <View
              style={[
                styles.unitInputContainer,
                touched.height && heightError ? styles.inputError : undefined,
              ]}
            >
              <TextInput
                value={personalInfo.height}
                onChangeText={(value) =>
                  updateField(
                    "height",
                    value.replace(/[^0-9]/g, "").slice(0, 3),
                  )
                }
                onBlur={() =>
                  setTouched((previous) => ({
                    ...previous,
                    height: true,
                  }))
                }
                placeholder="175"
                placeholderTextColor="#777B76"
                keyboardType="number-pad"
                maxLength={3}
                style={styles.unitInput}
              />

              <Text style={styles.unitText}>cm</Text>
            </View>
          </View>

          <View style={styles.smallField}>
            <View
              style={[
                styles.unitInputContainer,
                touched.currentWeight && currentWeightError
                  ? styles.inputError
                  : undefined,
              ]}
            >
              <TextInput
                value={personalInfo.currentWeight}
                onChangeText={(value) =>
                  updateField("currentWeight", formatWeightInput(value))
                }
                onBlur={() =>
                  setTouched((previous) => ({
                    ...previous,
                    currentWeight: true,
                  }))
                }
                placeholder="72"
                placeholderTextColor="#777B76"
                keyboardType="decimal-pad"
                maxLength={5}
                style={styles.unitInput}
              />

              <Text style={styles.unitText}>kg</Text>
            </View>
          </View>

          <View style={styles.smallField}>
            <View
              style={[
                styles.unitInputContainer,
                touched.targetWeight && targetWeightError
                  ? styles.inputError
                  : undefined,
              ]}
            >
              <TextInput
                value={personalInfo.targetWeight}
                onChangeText={(value) =>
                  updateField("targetWeight", formatWeightInput(value))
                }
                onBlur={() =>
                  setTouched((previous) => ({
                    ...previous,
                    targetWeight: true,
                  }))
                }
                placeholder="68"
                placeholderTextColor="#777B76"
                keyboardType="decimal-pad"
                maxLength={5}
                style={styles.unitInput}
              />

              <Text style={styles.unitText}>kg</Text>
            </View>
          </View>
        </View>

        {touched.height && heightError ? (
          <Text style={styles.errorText}>{heightError}</Text>
        ) : null}

        {touched.currentWeight && currentWeightError ? (
          <Text style={styles.errorText}>{currentWeightError}</Text>
        ) : null}

        {touched.targetWeight && targetWeightError ? (
          <Text style={styles.errorText}>{targetWeightError}</Text>
        ) : null}

        <Pressable
          disabled={!isFormValid || isSaving}
          onPress={handleContinue}
          style={[
            styles.continueButton,
            (!isFormValid || isSaving) && styles.continueButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={styles.continueButtonText}>Devam et</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    paddingTop: Platform.OS === "ios" ? 18 : 24,
    paddingHorizontal: 16,
    paddingBottom: 46,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "500",
  },
  activeStep: {
    color: GREEN,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    marginBottom: 50,
  },
  progressItem: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#C4D8B6",
  },
  progressActive: {
    backgroundColor: GREEN,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#676B65",
    marginBottom: 9,
    marginTop: 18,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderCard: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  goalCard: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  selectedCard: {
    borderColor: GREEN,
    backgroundColor: "#EDF8DE",
  },
  radioOuter: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  radioSelected: {
    borderColor: GREEN,
  },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#111111",
  },
  optionText: {
    fontSize: 12,
    lineHeight: 15,
    color: "#5F625E",
    fontWeight: "700",
    textAlign: "center",
  },
  selectedText: {
    color: GREEN,
  },
  doubleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  tripleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  smallField: {
    flex: 1,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
  },
  dateFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTextInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    fontSize: 13,
    color: TEXT,
  },
  calendarButton: {
    width: 42,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 8 : 0,
  },
  datePickerDoneButton: {
    alignSelf: "flex-end",
    marginRight: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: GREEN,
  },
  datePickerDoneText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "800",
  },
  unitInputContainer: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
  },
  unitInput: {
    flex: 1,
    height: 42,
    padding: 0,
    fontSize: 14,
    color: TEXT,
  },
  unitText: {
    fontSize: 13,
    color: "#777B76",
    fontWeight: "500",
  },
  inputError: {
    borderColor: ERROR,
  },
  errorText: {
    color: ERROR,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 5,
  },
  continueButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    shadowColor: GREEN,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: "#D6D9D1",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#101010",
  },
});

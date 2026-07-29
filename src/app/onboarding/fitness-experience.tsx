import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { FitnessPreference, useOnboarding } from "@/context/OnboardingContext";

const GREEN = "#79DE2D";
const BACKGROUND = "#F7F8F2";
const BORDER = "#BFDDA9";
const TEXT = "#1C1C1C";
const MUTED = "#666A64";

type FitnessOption = {
  id: FitnessPreference;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const fitnessOptions: FitnessOption[] = [
  {
    id: "cardio",
    title: "Kardiyovasküler",
    description: "Koşu, bisiklet, HIIT ve kondisyon odaklı çalışmalar.",
    icon: "heart-outline",
  },
  {
    id: "strength",
    title: "Direnç / Kuvvet",
    description: "Kas gelişimi, ağırlık ve vücut ağırlığı antrenmanları.",
    icon: "barbell-outline",
  },
  {
    id: "flexibility",
    title: "Esneklik / Denge",
    description: "Mobilite, yoga, core dengesi ve esneme rutinleri.",
    icon: "body-outline",
  },
];

export default function FitnessExperienceScreen() {
  const { fitnessPreferences, setFitnessPreferences } = useOnboarding();

  const [isSaving, setIsSaving] = useState(false);

  const isContinueEnabled = fitnessPreferences.length > 0 && !isSaving;

  const togglePreference = (preference: FitnessPreference) => {
    setFitnessPreferences((previous) => {
      const isSelected = previous.includes(preference);

      if (isSelected) {
        return previous.filter((item) => item !== preference);
      }

      return [...previous, preference];
    });
  };

  const handleContinue = async () => {
    if (!isContinueEnabled) {
      return;
    }

    setIsSaving(true);

    try {
      // Backend bağlantısı eklenene kadar geçici kayıt işlemi.
      await new Promise((resolve) => setTimeout(resolve, 700));

      Alert.alert("Başarılı", "Fitness tercihleriniz kaydedildi.");

      // Dördüncü onboarding ekranının yolu belli olduğunda
      // aşağıdaki yönlendirme onunla değiştirilecek.
      router.push("/onboarding/weekly-training-days");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </Pressable>

          <Text style={styles.stepText}>
            Adım <Text style={styles.activeStep}>3</Text> / 4
          </Text>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressItem, styles.progressActive]} />
          <View style={[styles.progressItem, styles.progressActive]} />
          <View style={[styles.progressItem, styles.progressActive]} />
          <View style={styles.progressItem} />
        </View>

        <Text style={styles.title}>
          Nasıl bir fitness{"\n"}
          deneyimi istiyorsun?
        </Text>

        <Text style={styles.subtitle}>
          Birden fazla seçenek işaretleyebilirsin.
        </Text>

        <View style={styles.optionsContainer}>
          {fitnessOptions.map((option) => {
            const selected = fitnessPreferences.includes(option.id);

            return (
              <Pressable
                key={option.id}
                onPress={() => togglePreference(option.id)}
                disabled={isSaving}
                style={[
                  styles.optionCard,
                  selected && styles.optionCardSelected,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={option.icon} size={21} color={TEXT} />
                </View>

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>

                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>

                <View
                  style={[
                    styles.selectionCircle,
                    selected && styles.selectionCircleSelected,
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#111111" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          disabled={!isContinueEnabled}
          onPress={handleContinue}
          style={[
            styles.continueButton,
            !isContinueEnabled && styles.continueButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <Text style={styles.continueButtonText}>Devam et</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flexGrow: 1,
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
    marginBottom: 46,
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
    lineHeight: 27,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 26,
  },
  optionsContainer: {
    gap: 10,
  },
  optionCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  optionCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#EDF8DE",
  },
  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#F1F4EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
    paddingRight: 10,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: MUTED,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCircleSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  continueButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
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

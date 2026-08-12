import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { FitnessPreference, useOnboarding } from "@/providers/OnboardingContext";
import { saveFitnessPreferences } from "@/shared/lib/services/fitnessPreferencesService";

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { fitnessPreferences, setFitnessPreferences } = useOnboarding();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
    setSaveError("");

    try {
      const result = await saveFitnessPreferences(fitnessPreferences);

      if (!result.success) {
        setSaveError(result.message);
        return;
      }

      router.push("/onboarding/weekly-training-days");
    } catch {
      setSaveError("Bağlantı sağlanamadı. Lütfen tekrar deneyin.");
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
            <Ionicons name="chevron-back" size={20} color={colors.text} />
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
                  <Ionicons name={option.icon} size={21} color={colors.text} />
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
                    <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

        <Pressable
          disabled={!isContinueEnabled}
          onPress={handleContinue}
          style={[
            styles.continueButton,
            !isContinueEnabled && styles.continueButtonDisabled,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.continueButtonText}>Devam et</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  stepText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeStep: {
    color: colors.primaryBright,
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
    backgroundColor: colors.disabled,
  },
  progressActive: {
    backgroundColor: colors.primaryBright,
  },
  title: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  optionCardSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primarySoft,
  },
  iconContainer: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
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
    color: colors.text,
    marginBottom: 3,
  },
  optionDescription: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionCircleSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  continueButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: colors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  errorText: {
    marginTop: 14,
    color: colors.error,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});

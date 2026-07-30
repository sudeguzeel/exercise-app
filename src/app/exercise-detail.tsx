import {
  validateCustomExerciseValue,
  validateCustomExerciseValues,
  type CustomExerciseValueErrors,
  type CustomExerciseValueKey,
  type CustomExerciseValues,
} from "@/src/features/exercises/exercise-detail-validation";
import {
  serializeProgramSelectionPayload,
  type ProgramSelectionPayload,
} from "@/src/features/exercises/program-selection";
import { MainColors } from "@/shared/constants/theme";
import {
  getExerciseById,
  getExerciseCategoryName,
} from "@/shared/lib/services/homeService";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

const INITIAL_CUSTOM_VALUES: CustomExerciseValues = {
  sets: "",
  reps: "",
  restSeconds: "",
};

const CUSTOM_FIELDS: {
  key: CustomExerciseValueKey;
  label: string;
  placeholder: string;
  maxLength: number;
}[] = [
  { key: "sets", label: "SET", placeholder: "1–10", maxLength: 2 },
  { key: "reps", label: "TEKRAR", placeholder: "1–100", maxLength: 3 },
  {
    key: "restSeconds",
    label: "DİNLENME",
    placeholder: "0–600",
    maxLength: 3,
  },
];

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{
    exerciseId?: string | string[];
  }>();
  const normalizedId = Array.isArray(exerciseId) ? exerciseId[0] : exerciseId;
  const exercise = normalizedId ? getExerciseById(normalizedId) : undefined;
  const categoryName = exercise
    ? getExerciseCategoryName(exercise.categoryId)
    : undefined;
  const [useCustomValues, setUseCustomValues] = useState(false);
  const [customValues, setCustomValues] = useState<CustomExerciseValues>(
    INITIAL_CUSTOM_VALUES,
  );
  const [errors, setErrors] = useState<CustomExerciseValueErrors>({});
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [hasMediaError, setHasMediaError] = useState(false);

  useEffect(() => {
    setIsMediaLoading(Boolean(exercise?.animationUri));
    setHasMediaError(false);
  }, [exercise?.animationUri]);

  const handleCustomValueChange = useCallback(
    (field: CustomExerciseValueKey, value: string) => {
      setCustomValues((currentValues) => ({
        ...currentValues,
        [field]: value,
      }));

      if (errors[field]) {
        const nextError = validateCustomExerciseValue(field, value);
        setErrors((currentErrors) => ({
          ...currentErrors,
          [field]: nextError,
        }));
      }
    },
    [errors],
  );

  const handleCustomToggle = useCallback(() => {
    setUseCustomValues((currentValue) => !currentValue);
    setErrors({});
  }, []);

  const handleAddToProgram = useCallback(() => {
    if (!exercise) return;

    let payload: ProgramSelectionPayload;
    if (useCustomValues) {
      const validation = validateCustomExerciseValues(customValues);
      if (!validation.success) {
        setErrors(validation.errors);
        return;
      }

      payload = {
        exerciseId: exercise.id,
        sets: validation.values.sets,
        reps: String(validation.values.reps),
        restSeconds: validation.values.restSeconds,
        valueSource: "custom",
      };
    } else {
      payload = {
        exerciseId: exercise.id,
        sets: exercise.recommendedSets,
        reps: exercise.recommendedReps,
        restSeconds: exercise.recommendedRestSeconds,
        valueSource: "recommended",
      };
    }

    router.push({
      pathname: "/program-selection",
      params: serializeProgramSelectionPayload(payload),
    });
  }, [customValues, exercise, useCustomValues]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Egzersizlere geri dön"
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.roundButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={MainColors.text}
                />
              </Pressable>

              <Pressable
                accessibilityHint="Profil ekranı henüz mevcut değil"
                accessibilityLabel="Profil"
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={styles.roundButton}
              >
                <Ionicons
                  name="person-outline"
                  size={25}
                  color={MainColors.text}
                />
              </Pressable>
            </View>

            {exercise ? (
              <>
                <View style={styles.mediaCard}>
                  <View style={styles.mediaBadge}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                      style={styles.mediaBadgeText}
                    >
                      {(categoryName ?? exercise.categoryId).toLocaleUpperCase(
                        "tr-TR",
                      )}{" "}
                      · {exercise.exerciseType.toLocaleUpperCase("tr-TR")}
                    </Text>
                  </View>

                  {exercise.animationUri && !hasMediaError ? (
                    <Image
                      accessibilityLabel={`${exercise.name} uygulama animasyonu`}
                      contentFit="contain"
                      onError={() => {
                        setHasMediaError(true);
                        setIsMediaLoading(false);
                      }}
                      onLoad={() => setIsMediaLoading(false)}
                      onLoadStart={() => setIsMediaLoading(true)}
                      source={{ uri: exercise.animationUri }}
                      style={styles.animation}
                    />
                  ) : (
                    <View
                      accessibilityLabel={`${exercise.name} egzersiz görseli`}
                      style={styles.mediaPlaceholder}
                    >
                      <Ionicons
                        name={exercise.image}
                        size={112}
                        color={MainColors.mutedText}
                      />
                    </View>
                  )}

                  {isMediaLoading ? (
                    <View style={styles.mediaLoading}>
                      <ActivityIndicator
                        color={MainColors.primary}
                        size="large"
                      />
                    </View>
                  ) : null}
                </View>

                <Text maxFontSizeMultiplier={1.3} style={styles.title}>
                  {exercise.name}
                </Text>

                <View style={styles.muscleTags}>
                  <View style={[styles.muscleTag, styles.primaryMuscleTag]}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.primaryMuscleText}
                    >
                      {exercise.primaryMuscle} (Ana)
                    </Text>
                  </View>
                  {exercise.secondaryMuscles.map((muscle) => (
                    <View key={muscle} style={styles.muscleTag}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.secondaryMuscleText}
                      >
                        {muscle}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text maxFontSizeMultiplier={1.3} style={styles.description}>
                  {exercise.description}
                </Text>

                <View style={styles.metricRow}>
                  <MetricCard
                    label="SET"
                    value={String(exercise.recommendedSets)}
                  />
                  <MetricCard
                    label="TEKRAR"
                    value={exercise.recommendedReps}
                  />
                  <MetricCard
                    label="DİNLENME"
                    value={`${exercise.recommendedRestSeconds} sn`}
                  />
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: useCustomValues }}
                  onPress={handleCustomToggle}
                  style={({ pressed }) => [
                    styles.customToggle,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      useCustomValues && styles.checkboxSelected,
                    ]}
                  >
                    {useCustomValues ? (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={MainColors.surface}
                      />
                    ) : null}
                  </View>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={styles.customToggleText}
                  >
                    Kendi set, tekrar ve dinlenme değerlerimi belirlemek
                    istiyorum.
                  </Text>
                </Pressable>

                {useCustomValues ? (
                  <View style={styles.customFieldRow}>
                    {CUSTOM_FIELDS.map((field) => (
                      <View key={field.key} style={styles.customField}>
                        <Text
                          maxFontSizeMultiplier={1.3}
                          style={styles.customFieldLabel}
                        >
                          {field.label}
                        </Text>
                        <TextInput
                          accessibilityLabel={`Özel ${field.label.toLocaleLowerCase(
                            "tr-TR",
                          )}`}
                          inputMode="numeric"
                          keyboardType="number-pad"
                          maxFontSizeMultiplier={1.3}
                          maxLength={field.maxLength}
                          onChangeText={(value) =>
                            handleCustomValueChange(field.key, value)
                          }
                          placeholder={field.placeholder}
                          placeholderTextColor={MainColors.mutedText}
                          returnKeyType="done"
                          style={[
                            styles.customInput,
                            errors[field.key] && styles.customInputError,
                          ]}
                          value={customValues[field.key]}
                        />
                        <Text
                          accessibilityLiveRegion="polite"
                          maxFontSizeMultiplier={1.3}
                          style={styles.fieldError}
                        >
                          {errors[field.key] ?? " "}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  onPress={handleAddToProgram}
                  style={({ pressed }) => [
                    styles.addButton,
                    pressed && styles.addButtonPressed,
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.addButtonText}>
                    Programa Ekle
                  </Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.notFoundCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={MainColors.primary}
                />
                <Text maxFontSizeMultiplier={1.3} style={styles.notFoundTitle}>
                  Egzersiz bulunamadı
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={styles.notFoundText}>
                  İstenen egzersiz kaydı mevcut değil.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace("/exercise")}
                  style={styles.notFoundButton}
                >
                  <Text style={styles.notFoundButtonText}>
                    Egzersizlere dön
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text maxFontSizeMultiplier={1.3} style={styles.metricLabel}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
        minimumFontScale={0.78}
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MainColors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 50,
    height: 50,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 25,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  mediaCard: {
    height: 300,
    marginTop: 28,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 28,
    backgroundColor: MainColors.paleGreen,
    overflow: "hidden",
  },
  mediaBadge: {
    position: "absolute",
    top: 18,
    left: 18,
    zIndex: 2,
    maxWidth: "85%",
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#E7F2D3",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBadgeText: {
    color: MainColors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  animation: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 36,
  },
  mediaLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(241, 246, 235, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 26,
    color: MainColors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  muscleTags: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  muscleTag: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryMuscleTag: {
    borderColor: "#F9DED7",
    backgroundColor: "#F9DED7",
  },
  primaryMuscleText: {
    color: "#E6533F",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryMuscleText: {
    color: MainColors.mutedText,
    fontSize: 15,
    fontWeight: "800",
  },
  description: {
    marginTop: 22,
    color: MainColors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  metricRow: {
    marginTop: 24,
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    height: 92,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: MainColors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 5,
    color: MainColors.text,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  customToggle: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderColor: MainColors.primary,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxSelected: {
    backgroundColor: MainColors.primary,
  },
  customToggleText: {
    flex: 1,
    paddingTop: 2,
    color: MainColors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  customFieldRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  customField: {
    flex: 1,
    minWidth: 0,
  },
  customFieldLabel: {
    marginBottom: 7,
    color: MainColors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  customInput: {
    width: "100%",
    height: 52,
    paddingHorizontal: 6,
    paddingVertical: 0,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 16,
    backgroundColor: MainColors.surface,
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  customInputError: {
    borderColor: "#D14343",
  },
  fieldError: {
    minHeight: 44,
    marginTop: 5,
    color: "#D14343",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  addButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    backgroundColor: MainColors.primary,
  },
  addButtonText: {
    color: MainColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  notFoundCard: {
    marginTop: 48,
    padding: 28,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    alignItems: "center",
  },
  notFoundTitle: {
    marginTop: 16,
    color: MainColors.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  notFoundText: {
    marginTop: 8,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  notFoundButton: {
    height: 50,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundButtonText: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
});

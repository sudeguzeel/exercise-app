import {
  validateCustomExerciseValue,
  validateCustomExerciseValues,
  type CustomExerciseValueErrors,
  type CustomExerciseValueKey,
  type CustomExerciseValues,
} from "@/features/exercises/exercise-detail-validation";
import {
  parseInitialTrainingDay,
  serializeProgramSelectionPayload,
  type ProgramSelectionSearchParams,
  type ProgramSelectionPayload,
} from "@/features/exercises/program-selection";
import { resolveProgramExerciseRestSeconds } from "@/features/exercises/program-exercise-rest";
import { addExerciseToProgramEditDraft } from "@/features/programs/program-edit-draft";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { useFavorites } from "@/providers/FavoritesContext";
import {
  getExerciseDetail,
  type ExerciseDetail,
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  sets: "3",
  reps: "10",
  restSeconds: "45",
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
    placeholder: "0–300",
    maxLength: 4,
  },
];

const CUSTOM_FIELD_LIMITS: Record<
  CustomExerciseValueKey,
  { min: number; max: number }
> = {
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  restSeconds: { min: 0, max: 300 },
};

function formatExerciseName(name: string) {
  return name.replace(/(^|[\s(/-])([a-zçğıöşü])/g, (_match, prefix, letter) =>
    `${prefix}${letter.toLocaleUpperCase("tr-TR")}`,
  );
}

function MetricCard({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricControlRow}>
        <Pressable
          accessibilityLabel={`${label} değerini azalt`}
          accessibilityRole="button"
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.metricControlButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="remove" size={18} color={colors.primary} />
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.metricValue}>
          {value}
        </Text>
        <Pressable
          accessibilityLabel={`${label} değerini artır`}
          accessibilityRole="button"
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.metricControlButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
        </Pressable>
      </View>
      <Text maxFontSizeMultiplier={1.3} style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const searchParams = useLocalSearchParams<ProgramSelectionSearchParams & {
    selectionMode?: string | string[];
    editProgramId?: string | string[];
    selectedDate?: string | string[];
  }>();
  const { exerciseId, selectionMode, editProgramId, selectedDate } = searchParams;
  const initialTrainingDay = useMemo(
    () => parseInitialTrainingDay(searchParams),
    [searchParams],
  );
  const normalizedId = Array.isArray(exerciseId) ? exerciseId[0] : exerciseId;
  const normalizedSelectionMode = Array.isArray(selectionMode)
    ? selectionMode[0]
    : selectionMode;
  const normalizedEditProgramId = Array.isArray(editProgramId)
    ? editProgramId[0]
    : editProgramId;
  const normalizedSelectedDate = Array.isArray(selectedDate)
    ? selectedDate[0]
    : selectedDate;

  const [exercise, setExercise] = useState<ExerciseDetail | null | undefined>(
    undefined,
  );
  const [loadError, setLoadError] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [useCustomValues, setUseCustomValues] = useState(false);
  const [customValues, setCustomValues] = useState<CustomExerciseValues>(
    INITIAL_CUSTOM_VALUES,
  );
  const [errors, setErrors] = useState<CustomExerciseValueErrors>({});

  const hasRecommendedValues = Boolean(
    exercise &&
      exercise.recommendedSets !== null &&
      exercise.recommendedReps !== null &&
      exercise.recommendedRestSeconds !== null,
  );

  const loadExercise = useCallback(
    async (mountedRef?: { current: boolean }) => {
      if (!normalizedId) {
        setExercise(null);
        return;
      }

      setExercise(undefined);
      setLoadError(false);

      try {
        const result = await getExerciseDetail(normalizedId);
        if (!mountedRef || mountedRef.current) setExercise(result);
      } catch {
        // getExerciseDetail sadece gerçek bir sorgu hatasında (ağ/DB)
        // fırlatır; "bulunamadı" durumu zaten null döner ve ayrı bir
        // ekranla ele alınır.
        if (!mountedRef || mountedRef.current) setLoadError(true);
      }
    },
    [normalizedId],
  );

  useEffect(() => {
    const mountedRef = { current: true };
    void loadExercise(mountedRef);
    return () => {
      mountedRef.current = false;
    };
  }, [loadExercise]);

  // Öneri varsa önce dataset değerini kullan; öneri yoksa manuel alanları aç.
  useEffect(() => {
    setUseCustomValues(!hasRecommendedValues);
    setCustomValues(INITIAL_CUSTOM_VALUES);
    setErrors({});
    setGifFailed(false);
  }, [exercise?.id, hasRecommendedValues]);

  const handleValueChange = useCallback(
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
    setUseCustomValues((current) => !current);
    setErrors({});
  }, []);

  const adjustCustomValue = useCallback(
    (field: CustomExerciseValueKey, change: number) => {
      const limits = CUSTOM_FIELD_LIMITS[field];
      setCustomValues((currentValues) => {
        const currentValue = Number.parseInt(currentValues[field], 10);
        const safeValue = Number.isNaN(currentValue) ? limits.min : currentValue;
        const nextValue = Math.min(
          limits.max,
          Math.max(limits.min, safeValue + change),
        );

        return { ...currentValues, [field]: String(nextValue) };
      });
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: undefined,
      }));
    },
    [],
  );

  const adjustRecommendedValue = useCallback(
    (field: CustomExerciseValueKey, change: number) => {
      if (
        !exercise ||
        exercise.recommendedSets === null ||
        exercise.recommendedReps === null ||
        exercise.recommendedRestSeconds === null
      ) {
        return;
      }

      const recommendedValues: CustomExerciseValues = {
        sets: String(exercise.recommendedSets),
        reps: String(exercise.recommendedReps),
        restSeconds: String(
          resolveProgramExerciseRestSeconds({
            customRestSeconds: null,
            recommendedRestSeconds: exercise.recommendedRestSeconds,
          }),
        ),
      };
      const limits = CUSTOM_FIELD_LIMITS[field];
      const nextValue = Math.min(
        limits.max,
        Math.max(limits.min, Number(recommendedValues[field]) + change),
      );

      setCustomValues({ ...recommendedValues, [field]: String(nextValue) });
      setErrors({});
      setUseCustomValues(true);
    },
    [exercise],
  );

  const handleAddToProgram = useCallback(() => {
    if (!exercise) return;

    let payload: ProgramSelectionPayload;

    if (
      !useCustomValues &&
      hasRecommendedValues &&
      exercise.recommendedSets !== null &&
      exercise.recommendedReps !== null &&
      exercise.recommendedRestSeconds !== null
    ) {
      payload = {
        exerciseId: exercise.id,
        sets: exercise.recommendedSets,
        reps: exercise.recommendedReps,
        restSeconds: resolveProgramExerciseRestSeconds({
          customRestSeconds: null,
          recommendedRestSeconds: exercise.recommendedRestSeconds,
        }),
      };
    } else {
      const validation = validateCustomExerciseValues(customValues);
      if (!validation.success) {
        setErrors(validation.errors);
        return;
      }

      payload = {
        exerciseId: exercise.id,
        sets: validation.values.sets,
        reps: validation.values.reps,
        restSeconds: resolveProgramExerciseRestSeconds({
          customRestSeconds: validation.values.restSeconds,
          recommendedRestSeconds: exercise.recommendedRestSeconds,
        }),
      };
    }

    if (
      normalizedSelectionMode === "program-edit" &&
      normalizedEditProgramId
    ) {
      const result = addExerciseToProgramEditDraft(
        normalizedEditProgramId,
        payload,
        exercise.name,
      );
      if (result === "duplicate") {
        Alert.alert("Egzersiz zaten mevcut", "Bu egzersiz programda zaten bulunuyor.");
        return;
      }
      if (result === "missing-draft") {
        Alert.alert(
          "Taslak bulunamadı",
          "Program düzenleme bilgileri artık mevcut değil. Lütfen programa geri dönün.",
        );
        return;
      }
      router.replace({
        pathname: "/program-edit" as never,
        params: {
          programId: normalizedEditProgramId,
          ...(normalizedSelectedDate ? { selectedDate: normalizedSelectedDate } : {}),
        },
      });
      return;
    }

    if (normalizedSelectionMode === "new-program") {
      router.push({
        pathname: "/new-program",
        params: {
          ...serializeProgramSelectionPayload(payload, initialTrainingDay),
          ...(normalizedSelectedDate
            ? { selectedDate: normalizedSelectedDate }
            : {}),
        },
      });
      return;
    }

    router.push({
      pathname: "/program-selection",
      params: serializeProgramSelectionPayload(payload, initialTrainingDay),
    });
  }, [
    customValues,
    exercise,
    hasRecommendedValues,
    normalizedEditProgramId,
    normalizedSelectedDate,
    normalizedSelectionMode,
    initialTrainingDay,
    useCustomValues,
  ]);

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
                  color={colors.text}
                />
              </Pressable>

              <Pressable
                accessibilityLabel={
                  exercise && isFavorite(exercise.id)
                    ? "Favorilerden çıkar"
                    : "Favorilere ekle"
                }
                accessibilityRole="button"
                accessibilityState={{
                  disabled: !exercise,
                  selected: exercise ? isFavorite(exercise.id) : false,
                }}
                disabled={!exercise}
                onPress={() => {
                  if (exercise) toggleFavorite(exercise);
                }}
                style={({ pressed }) => [
                  styles.roundButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name={
                    exercise && isFavorite(exercise.id)
                      ? "heart"
                      : "heart-outline"
                  }
                  size={25}
                  color={
                    exercise && isFavorite(exercise.id)
                      ? colors.primary
                      : colors.text
                  }
                />
              </Pressable>
            </View>

            {loadError ? (
              <View style={styles.notFoundCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={colors.primary}
                />
                <Text maxFontSizeMultiplier={1.3} style={styles.notFoundTitle}>
                  Egzersiz yüklenemedi
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={styles.notFoundText}>
                  Bağlantınızı kontrol edip tekrar deneyin.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadExercise()}
                  style={styles.notFoundButton}
                >
                  <Text style={styles.notFoundButtonText}>Yeniden dene</Text>
                </Pressable>
              </View>
            ) : exercise === undefined ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : exercise ? (
              <>
                <View style={styles.mediaCard}>
                  <View style={styles.mediaBadge}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                      style={styles.mediaBadgeText}
                    >
                      {[
                        exercise.bodyPartName,
                        exercise.exerciseType,
                        exercise.level,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                        .toLocaleUpperCase("tr-TR")}
                    </Text>
                  </View>

                  {exercise.gifUrl && !gifFailed ? (
                    <Image
                      accessibilityLabel={`${exercise.name} egzersiz animasyonu`}
                      onError={() => setGifFailed(true)}
                      resizeMode="contain"
                      source={{ uri: exercise.gifUrl }}
                      style={styles.mediaImage}
                    />
                  ) : (
                    <View
                      accessibilityLabel={`${exercise.name} egzersiz görseli`}
                      style={styles.mediaPlaceholder}
                    >
                      <Ionicons
                        name={exercise.icon}
                        size={112}
                        color={colors.textSecondary}
                      />
                    </View>
                  )}

                  <View style={styles.mediaMuscleInfo}>
                    <View style={styles.mediaMuscleInfoRow}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoLabel}
                      >
                        🔴 Birincil Kas
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoPrimaryValue}
                      >
                        {exercise.targetMuscleName ?? "—"}
                      </Text>
                    </View>
                    <View style={styles.mediaMuscleInfoRow}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoLabel}
                      >
                        🟡 İkincil Kaslar
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoValue}
                      >
                        {exercise.secondaryMuscleNames.length > 0
                          ? exercise.secondaryMuscleNames.join(" • ")
                          : "—"}
                      </Text>
                    </View>
                    <View style={styles.mediaMuscleInfoRow}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoLabel}
                      >
                        ⚙️ Ekipman
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.mediaMuscleInfoValue}
                      >
                        {exercise.equipmentName ?? "—"}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text maxFontSizeMultiplier={1.3} style={styles.title}>
                  {formatExerciseName(exercise.name)}
                </Text>

                {exercise.steps.length > 0 ? (
                  <View style={styles.stepsSection}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.stepsTitle}>
                      Nasıl yapılır?
                    </Text>
                    {exercise.steps.map((step, index) => (
                      <View key={index} style={styles.stepRow}>
                        <View style={styles.stepIndex}>
                          <Text
                            maxFontSizeMultiplier={1.3}
                            style={styles.stepIndexText}
                          >
                            {index + 1}
                          </Text>
                        </View>
                        <Text
                          maxFontSizeMultiplier={1.3}
                          style={styles.stepDescription}
                        >
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Text maxFontSizeMultiplier={1.3} style={styles.fieldsTitle}>
                  Set / Tekrar / Dinlenme Süresi
                </Text>

                {hasRecommendedValues &&
                exercise.recommendedSets !== null &&
                exercise.recommendedReps !== null &&
                exercise.recommendedRestSeconds !== null &&
                !useCustomValues ? (
                  <View style={styles.metricRow}>
                    <MetricCard
                      label="SET"
                      value={String(exercise.recommendedSets)}
                      onDecrement={() => adjustRecommendedValue("sets", -1)}
                      onIncrement={() => adjustRecommendedValue("sets", 1)}
                    />
                    <MetricCard
                      label="TEKRAR"
                      value={String(exercise.recommendedReps)}
                      onDecrement={() => adjustRecommendedValue("reps", -1)}
                      onIncrement={() => adjustRecommendedValue("reps", 1)}
                    />
                    <MetricCard
                      label="DİNLENME"
                      value={`${resolveProgramExerciseRestSeconds({
                        customRestSeconds: null,
                        recommendedRestSeconds:
                          exercise.recommendedRestSeconds,
                      })} sn`}
                      onDecrement={() =>
                        adjustRecommendedValue("restSeconds", -1)
                      }
                      onIncrement={() =>
                        adjustRecommendedValue("restSeconds", 1)
                      }
                    />
                  </View>
                ) : null}

                {hasRecommendedValues ? (
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
                          color={colors.onPrimary}
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
                ) : null}

                {useCustomValues || !hasRecommendedValues ? (
                <View style={styles.customFieldRow}>
                  {CUSTOM_FIELDS.map((field) => (
                    <View key={field.key} style={styles.customField}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.customFieldLabel}
                      >
                        {field.label}
                      </Text>
                      <View
                        style={[
                          styles.customInputRow,
                          errors[field.key] && styles.customInputError,
                        ]}
                      >
                        <Pressable
                          accessibilityLabel={`${field.label.toLocaleLowerCase("tr-TR")} değerini azalt`}
                          accessibilityRole="button"
                          onPress={() => adjustCustomValue(field.key, -1)}
                          style={({ pressed }) => [
                            styles.customControlButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={colors.primary}
                          />
                        </Pressable>
                        <TextInput
                          accessibilityLabel={`${field.label.toLocaleLowerCase(
                            "tr-TR",
                          )}`}
                          inputMode="numeric"
                          keyboardType="number-pad"
                          maxFontSizeMultiplier={1.3}
                          maxLength={field.maxLength}
                          onChangeText={(value) =>
                            handleValueChange(
                              field.key,
                              field.key === "restSeconds"
                                ? value.replace(/\D/g, "")
                                : value,
                            )
                          }
                          placeholder={field.placeholder}
                          placeholderTextColor={colors.placeholder}
                          returnKeyType="done"
                          style={styles.customInput}
                          value={
                            field.key === "restSeconds"
                              ? `${customValues[field.key]}s`
                              : customValues[field.key]
                          }
                        />
                        <Pressable
                          accessibilityLabel={`${field.label.toLocaleLowerCase("tr-TR")} değerini artır`}
                          accessibilityRole="button"
                          onPress={() => adjustCustomValue(field.key, 1)}
                          style={({ pressed }) => [
                            styles.customControlButton,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Ionicons
                            name="add"
                            size={18}
                            color={colors.primary}
                          />
                        </Pressable>
                      </View>
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
                  color={colors.primary}
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

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderColor: colors.border,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  loadingCard: {
    height: 300,
    marginTop: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaCard: {
    marginTop: 28,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
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
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBadgeText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  mediaImage: {
    width: "100%",
    height: 240,
  },
  mediaPlaceholder: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaMuscleInfo: {
    width: "100%",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: "row",
    gap: 12,
  },
  mediaMuscleInfoRow: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 3,
  },
  mediaMuscleInfoLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.15,
    textAlign: "center",
  },
  mediaMuscleInfoPrimaryValue: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  mediaMuscleInfoValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  title: {
    marginTop: 26,
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  stepsSection: {
    marginTop: 26,
  },
  stepsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  stepIndex: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepIndexText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900",
  },
  stepDescription: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "600",
  },
  fieldsTitle: {
    marginTop: 28,
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  metricRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  metricControlRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  metricControlButton: {
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    width: 32,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  metricLabel: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  customToggle: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  customToggleText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  customFieldRow: {
    marginTop: 14,
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
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  customInputRow: {
    width: "100%",
    height: 52,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    overflow: "hidden",
  },
  customControlButton: {
    width: 26,
    height: 34,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  customInput: {
    width: 32,
    minWidth: 0,
    height: "100%",
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  customInputError: {
    borderColor: colors.error,
  },
  fieldError: {
    minHeight: 44,
    marginTop: 5,
    color: colors.error,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  addButton: {
    height: 56,
    marginTop: 18,
    borderRadius: 20,
    backgroundColor: colors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  notFoundCard: {
    marginTop: 48,
    padding: 28,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  notFoundTitle: {
    marginTop: 16,
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  notFoundText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  notFoundButton: {
    height: 50,
    marginTop: 22,
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: colors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
});

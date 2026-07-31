import type { TrainingDay } from "@/providers/OnboardingContext";
import {
  parseProgramSelectionParams,
  type ProgramSelectionSearchParams,
} from "@/src/features/exercises/program-selection";
import { ProgramFlowHeader } from "@/src/features/programs/components/program-flow-header";
import { ProgramResultModal } from "@/src/features/programs/components/program-result-modal";
import { SelectionChip } from "@/src/features/programs/components/selection-chip";
import {
  isProgramFormValid,
  toggleSelection,
  TRAINING_DAY_OPTIONS,
} from "@/src/features/programs/program-domain";
import {
  ProgramRepositoryError,
  programRepository,
} from "@/src/features/programs/mock-program-repository";
import { MainColors } from "@/shared/constants/theme";
import {
  getExerciseById,
  getExerciseCatalog,
} from "@/shared/lib/services/homeService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

type FormModalState = {
  title: string;
  message: string;
  success: boolean;
} | null;

export default function NewProgramScreen() {
  const searchParams =
    useLocalSearchParams<ProgramSelectionSearchParams>();
  const selection = useMemo(
    () => parseProgramSelectionParams(searchParams),
    [searchParams],
  );
  const exercise = selection
    ? getExerciseById(selection.exerciseId)
    : undefined;
  const muscleGroups = useMemo(() => getExerciseCatalog().categories, []);
  const [programName, setProgramName] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<TrainingDay>>(
    new Set(),
  );
  const [selectedMuscleGroupIds, setSelectedMuscleGroupIds] = useState<
    Set<string>
  >(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<FormModalState>(null);

  const isRouteValid = Boolean(selection && exercise);
  const canSubmit =
    isRouteValid &&
    isProgramFormValid(
      programName,
      selectedDays,
      selectedMuscleGroupIds,
    ) &&
    !isSubmitting;
  const trimmedProgramName = programName.trim();

  const handleCreateProgram = useCallback(async () => {
    if (!selection || !exercise || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await programRepository.createProgramWithExercise({
        name: programName,
        trainingDays: [...selectedDays],
        muscleGroupIds: [...selectedMuscleGroupIds],
        exercise: selection,
      });
      setModalState({
        title: "Program oluşturuldu",
        message:
          "Program oluşturuldu ve egzersiz programa başarıyla eklendi.",
        success: true,
      });
    } catch (error) {
      if (
        error instanceof ProgramRepositoryError &&
        error.code === "DUPLICATE_NAME"
      ) {
        setModalState({
          title: "Program oluşturulamadı",
          message: "Bu ad ile zaten bir programınız var.",
          success: false,
        });
      } else {
        setModalState({
          title: "Program oluşturulamadı",
          message:
            "Program oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.",
          success: false,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    exercise,
    isSubmitting,
    programName,
    selectedDays,
    selectedMuscleGroupIds,
    selection,
  ]);

  const handleModalConfirm = useCallback(() => {
    const shouldLeaveScreen = modalState?.success === true;
    setModalState(null);
    if (shouldLeaveScreen) {
      router.replace("/exercise");
    }
  }, [modalState?.success]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.screen}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <ProgramFlowHeader
                onBack={() => router.back()}
                title="Yeni program"
              />

              {isRouteValid ? (
                <>
                  <View style={styles.section}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.sectionLabel}
                    >
                      PROGRAM ADI
                    </Text>
                    <TextInput
                      accessibilityLabel="Program adı"
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      maxFontSizeMultiplier={1.3}
                      onChangeText={setProgramName}
                      placeholder="Örn. İtiş Günü"
                      placeholderTextColor={MainColors.mutedText}
                      returnKeyType="done"
                      style={styles.nameInput}
                      value={programName}
                    />
                  </View>

                  <View style={styles.section}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.sectionLabel}
                    >
                      HANGİ GÜNLER YAPILACAK?
                    </Text>
                    <View style={styles.dayGrid}>
                      {TRAINING_DAY_OPTIONS.map((day) => (
                        <SelectionChip
                          accessibilityLabel={day.label}
                          compact
                          key={day.id}
                          label={day.shortLabel}
                          onPress={() =>
                            setSelectedDays((currentSelection) =>
                              toggleSelection(currentSelection, day.id),
                            )
                          }
                          selected={selectedDays.has(day.id)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.sectionLabel}
                    >
                      ODAKLANILAN KAS GRUPLARI
                    </Text>
                    <View style={styles.muscleGrid}>
                      {muscleGroups.map((muscleGroup) => (
                        <SelectionChip
                          key={muscleGroup.id}
                          label={muscleGroup.name}
                          onPress={() =>
                            setSelectedMuscleGroupIds((currentSelection) =>
                              toggleSelection(
                                currentSelection,
                                muscleGroup.id,
                              ),
                            )
                          }
                          selected={selectedMuscleGroupIds.has(muscleGroup.id)}
                        />
                      ))}
                    </View>
                  </View>

                  <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        numberOfLines={2}
                        style={styles.summaryTitle}
                      >
                        {trimmedProgramName || "Yeni program"}
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.summaryDayCount}
                      >
                        {selectedDays.size} gün
                      </Text>
                    </View>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={styles.summaryDescription}
                    >
                      Bu programı oluşturduğunda, egzersiz eklerken listede
                      görünecek ve “Program” sekmende haftalık takvimine
                      işlenecek.
                    </Text>
                  </View>
                </>
              ) : (
                <View style={styles.invalidCard}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={44}
                    color={MainColors.primary}
                  />
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={styles.invalidTitle}
                  >
                    Egzersiz bilgileri bulunamadı
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.invalidText}>
                    Yeni program akışını egzersiz detayından tekrar başlatın.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace("/exercise")}
                    style={({ pressed }) => [
                      styles.invalidButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.invalidButtonText}>
                      Egzersizlere dön
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          {isRouteValid ? (
            <View style={styles.footer}>
              <View style={styles.footerContent}>
                <Pressable
                  accessibilityLabel="Programı oluştur"
                  accessibilityRole="button"
                  accessibilityState={{
                    busy: isSubmitting,
                    disabled: !canSubmit,
                  }}
                  disabled={!canSubmit}
                  onPress={() => void handleCreateProgram()}
                  style={({ pressed }) => [
                    styles.submitButton,
                    !canSubmit && styles.submitButtonDisabled,
                    pressed && canSubmit && styles.submitButtonPressed,
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={MainColors.text} />
                  ) : (
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={[
                        styles.submitButtonText,
                        !canSubmit && styles.submitButtonTextDisabled,
                      ]}
                    >
                      Programı oluştur
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ProgramResultModal
        message={modalState?.message ?? ""}
        onConfirm={handleModalConfirm}
        success={modalState?.success}
        title={modalState?.title ?? ""}
        visible={modalState !== null}
      />
    </SafeAreaView>
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
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 112,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 28,
  },
  sectionLabel: {
    marginBottom: 10,
    color: MainColors.mutedText,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  nameInput: {
    width: "100%",
    height: 56,
    paddingHorizontal: 18,
    paddingVertical: 0,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  muscleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    marginTop: 30,
    padding: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  summaryTitle: {
    flex: 1,
    minWidth: 0,
    color: MainColors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },
  summaryDayCount: {
    color: MainColors.primary,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "800",
  },
  summaryDescription: {
    marginTop: 9,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 21,
  },
  invalidCard: {
    marginTop: 52,
    padding: 26,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    alignItems: "center",
  },
  invalidTitle: {
    marginTop: 14,
    color: MainColors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  invalidText: {
    marginTop: 8,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  invalidButton: {
    minHeight: 50,
    marginTop: 20,
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  invalidButtonText: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: MainColors.subtleBorder,
    backgroundColor: MainColors.background,
  },
  footerContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  submitButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#D9DDD5",
  },
  submitButtonPressed: {
    backgroundColor: MainColors.primary,
  },
  submitButtonText: {
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  submitButtonTextDisabled: {
    color: MainColors.mutedText,
  },
  pressed: {
    opacity: 0.72,
  },
});

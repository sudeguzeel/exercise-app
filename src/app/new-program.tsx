import {
  parseInitialTrainingDay,
  parseProgramSelectionParams,
  type ProgramSelectionSearchParams,
} from "@/features/exercises/program-selection";
import { ProgramFlowHeader } from "@/features/programs/components/program-flow-header";
import { ProgramResultModal } from "@/features/programs/components/program-result-modal";
import { SelectionChip } from "@/features/programs/components/selection-chip";
import { getCurrentWeek } from "@/features/programs/program-dashboard";
import {
  isProgramFormValid,
  toggleSelection,
  TRAINING_DAY_OPTIONS,
} from "@/features/programs/program-domain";
import {
  programRepository,
  ProgramRepositoryError,
} from "@/features/programs/program-repository";
import { saveInitialProgramExerciseWeight } from "@/features/progress/progress-storage";
import type { TrainingDay } from "@/providers/OnboardingContext";
import { MainColors } from "@/shared/constants/theme";
import {
  getExerciseSummary,
  type ExerciseSummary,
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const REMINDER_TIMES = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

export default function NewProgramScreen() {
  const searchParams =
    useLocalSearchParams<ProgramSelectionSearchParams>();
  const selection = useMemo(
    () => parseProgramSelectionParams(searchParams),
    [searchParams],
  );
  const initialTrainingDay = useMemo(
    () => parseInitialTrainingDay(searchParams),
    [searchParams],
  );
  const [exercise, setExercise] = useState<ExerciseSummary | null>(null);

  useEffect(() => {
    if (!selection) {
      setExercise(null);
      return;
    }
    let mounted = true;
    void getExerciseSummary(selection.exerciseId).then((result) => {
      if (mounted) setExercise(result);
    });
    return () => {
      mounted = false;
    };
  }, [selection]);

  const [programName, setProgramName] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<TrainingDay>>(
    () => new Set(initialTrainingDay ? [initialTrainingDay] : []),
  );
  const lastAppliedInitialTrainingDay = useRef(initialTrainingDay);

  useEffect(() => {
    if (
      initialTrainingDay &&
      initialTrainingDay !== lastAppliedInitialTrainingDay.current
    ) {
      setSelectedDays(new Set([initialTrainingDay]));
    }
    lastAppliedInitialTrainingDay.current = initialTrainingDay;
  }, [initialTrainingDay]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState<FormModalState>(null);
  const [createdProgramId, setCreatedProgramId] = useState<string | null>(
    null,
  );
  const [leaveAfterModal, setLeaveAfterModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState(["18:00"]);
  const [reminderListOpen, setReminderListOpen] = useState<number | null>(null);

  const isRouteValid = Boolean(selection && exercise);
  const muscleGroupIds = useMemo(
    () => new Set(exercise?.bodyPartId ? [exercise.bodyPartId] : []),
    [exercise?.bodyPartId],
  );
  const canSubmit =
    isRouteValid &&
    isProgramFormValid(
      programName,
      selectedDays,
      muscleGroupIds,
    ) &&
    !isSubmitting;
  const trimmedProgramName = programName.trim();

  const handleCreateProgram = useCallback(async () => {
    if (!selection || !exercise || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const createdProgram = await programRepository.createProgramWithExercise({
        name: programName,
        trainingDays: [...selectedDays],
        muscleGroupIds: [...muscleGroupIds],
        exercise: selection,
      });
      setCreatedProgramId(createdProgram.id);
      setLeaveAfterModal(true);
      try {
        await saveInitialProgramExerciseWeight(
          createdProgram,
          selection.exerciseId,
          selection.weightKg,
        );
        setModalState({
          title: "Program oluşturuldu",
          message:
            "Program oluşturuldu ve egzersiz programa başarıyla eklendi.",
          success: true,
        });
      } catch {
        setModalState({
          title: "Kilo kaydı tamamlanamadı",
          message:
            "Program oluşturuldu ancak başlangıç kilosu kaydedilemedi. Hareket Kilolarını Güncelle ekranından tekrar deneyin.",
          success: false,
        });
      }
    } catch (error) {
      setLeaveAfterModal(false);
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
    muscleGroupIds,
    selection,
  ]);

  const handleModalConfirm = useCallback(() => {
    const shouldLeaveScreen = leaveAfterModal;
    setModalState(null);
    setLeaveAfterModal(false);
    if (shouldLeaveScreen) {
      const selectedDate = initialTrainingDay
        ? getCurrentWeek().find((day) => day.day === initialTrainingDay)
            ?.dateKey
        : undefined;
      if (selectedDate && createdProgramId) {
        router.replace({
          pathname: "/(main)/program",
          params: { selectedDate, activeProgramId: createdProgramId },
        });
        return;
      }
      router.replace("/(main)");
    }
  }, [createdProgramId, initialTrainingDay, leaveAfterModal]);

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
                      {initialTrainingDay
                        ? TRAINING_DAY_OPTIONS.filter(
                            (day) => day.id === initialTrainingDay,
                          ).map((day) => (
                            <View
                              accessibilityLabel={`${day.label}, seçili gün`}
                              accessible
                              key={day.id}
                              style={styles.fixedDayChip}
                            >
                              <Text style={styles.fixedDayText}>{day.shortLabel}</Text>
                            </View>
                          ))
                        : TRAINING_DAY_OPTIONS.map((day) => (
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

                  <View style={styles.reminderCard}>
                      <Pressable
                        accessibilityLabel="Antrenman hatırlatıcısını aç veya kapat"
                        accessibilityRole="switch"
                        accessibilityState={{ checked: reminderEnabled }}
                        onPress={() =>
                          setReminderEnabled((enabled) => {
                            if (enabled) setReminderListOpen(null);
                            return !enabled;
                          })
                        }
                        style={({ pressed }) => [
                          styles.reminderHeader,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Ionicons
                          name="notifications-outline"
                          size={22}
                          color={MainColors.primary}
                        />
                        <View style={styles.reminderTitleContent}>
                          <Text style={styles.reminderTitle}>
                            Antrenman Hatırlatıcısı
                          </Text>
                          <Text style={styles.reminderDescription}>
                            Antrenman saatinde bildirim al.
                          </Text>
                        </View>
                        <View style={styles.reminderToggleLabel}>
                          <View
                            style={[
                              styles.reminderStatusDot,
                              reminderEnabled && styles.reminderStatusDotActive,
                            ]}
                          />
                          <Text
                            style={[
                              styles.reminderToggleText,
                              reminderEnabled && styles.reminderToggleTextActive,
                            ]}
                          >
                            {reminderEnabled ? "Açık" : "Aç/Kapat"}
                          </Text>
                        </View>
                      </Pressable>

                      {reminderEnabled ? (
                        <View style={styles.reminderExpanded}>
                          <Text style={styles.reminderTimeLabel}>
                            Hatırlatma saatleri
                          </Text>
                          {reminderTimes.map((reminderTime, index) => (
                            <View key={`${index}-${reminderTime}`}>
                              <View style={styles.reminderTimeRow}>
                                <Pressable
                                  accessibilityLabel={`Hatırlatma saati ${reminderTime}. Saat listesini aç`}
                                  accessibilityRole="button"
                                  accessibilityState={{
                                    expanded: reminderListOpen === index,
                                  }}
                                  onPress={() =>
                                    setReminderListOpen((openIndex) =>
                                      openIndex === index ? null : index,
                                    )
                                  }
                                  style={({ pressed }) => [
                                    styles.selectedReminderTime,
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <Ionicons
                                    name="time-outline"
                                    size={21}
                                    color={MainColors.primary}
                                  />
                                  <Text style={styles.selectedReminderTimeText}>
                                    {reminderTime}
                                  </Text>
                                  <Ionicons
                                    name={
                                      reminderListOpen === index
                                        ? "chevron-up"
                                        : "chevron-down"
                                    }
                                    size={19}
                                    color={MainColors.mutedText}
                                  />
                                </Pressable>
                                {index > 0 ? (
                                  <Pressable
                                    accessibilityLabel={`${reminderTime} hatırlatmasını kaldır`}
                                    accessibilityRole="button"
                                    onPress={() => {
                                      setReminderTimes((times) =>
                                        times.filter((_, itemIndex) => itemIndex !== index),
                                      );
                                      setReminderListOpen(null);
                                    }}
                                    style={({ pressed }) => [
                                      styles.removeReminderButton,
                                      pressed && styles.pressed,
                                    ]}
                                  >
                                    <Ionicons
                                      name="close"
                                      size={19}
                                      color={MainColors.mutedText}
                                    />
                                  </Pressable>
                                ) : null}
                              </View>
                              {reminderListOpen === index ? (
                                <ScrollView
                                  nestedScrollEnabled
                                  showsVerticalScrollIndicator
                                  style={styles.reminderTimes}
                                >
                                  {REMINDER_TIMES.filter(
                                    (time) =>
                                      time === reminderTime ||
                                      !reminderTimes.includes(time),
                                  ).map((time) => {
                                    const selected = reminderTime === time;
                                    return (
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        key={time}
                                        onPress={() => {
                                          setReminderTimes((times) =>
                                            times.map((currentTime, itemIndex) =>
                                              itemIndex === index ? time : currentTime,
                                            ),
                                          );
                                          setReminderListOpen(null);
                                        }}
                                        style={({ pressed }) => [
                                          styles.reminderTimeOption,
                                          selected && styles.reminderTimeOptionSelected,
                                          pressed && styles.pressed,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.reminderTimeOptionText,
                                            selected &&
                                              styles.reminderTimeOptionTextSelected,
                                          ]}
                                        >
                                          {time}
                                        </Text>
                                      </Pressable>
                                    );
                                  })}
                                </ScrollView>
                              ) : null}
                            </View>
                          ))}
                          {reminderTimes.length < REMINDER_TIMES.length ? (
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => {
                                const nextTime = REMINDER_TIMES.find(
                                  (time) => !reminderTimes.includes(time),
                                );
                                if (!nextTime) return;
                                setReminderTimes((times) => [...times, nextTime]);
                                setReminderListOpen(reminderTimes.length);
                              }}
                              style={({ pressed }) => [
                                styles.addReminderButton,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Ionicons
                                name="add"
                                size={19}
                                color={MainColors.primary}
                              />
                              <Text style={styles.addReminderButtonText}>
                                Saat ekle
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      ) : null}
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
  fixedDayChip: {
    minWidth: 92,
    minHeight: 46,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: MainColors.primaryBright,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedDayText: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  selectedDayCard: {
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedDayContent: {
    flex: 1,
  },
  selectedDayText: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  selectedDayHint: {
    marginTop: 3,
    color: MainColors.mutedText,
    fontSize: 13,
  },
  reminderCard: {
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    overflow: "hidden",
  },
  reminderHeader: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reminderTitleContent: {
    flex: 1,
  },
  reminderTitle: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  reminderDescription: {
    marginTop: 3,
    color: MainColors.mutedText,
    fontSize: 12,
  },
  reminderToggleLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reminderStatusDot: {
    width: 11,
    height: 11,
    borderWidth: 1.5,
    borderColor: MainColors.mutedText,
    borderRadius: 6,
  },
  reminderStatusDotActive: {
    borderColor: MainColors.primary,
    backgroundColor: MainColors.primary,
  },
  reminderToggleText: {
    color: MainColors.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  reminderToggleTextActive: {
    color: MainColors.primary,
  },
  reminderExpanded: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: MainColors.subtleBorder,
  },
  reminderTimeLabel: {
    marginTop: 14,
    color: MainColors.mutedText,
    fontSize: 13,
    fontWeight: "800",
  },
  reminderTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedReminderTime: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  removeReminderButton: {
    width: 38,
    height: 38,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedReminderTimeText: {
    flex: 1,
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  reminderChevron: {
    color: MainColors.mutedText,
    fontSize: 24,
  },
  reminderTimes: {
    maxHeight: 240,
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 14,
  },
  reminderTimeOption: {
    width: "100%",
    minHeight: 46,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: MainColors.subtleBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderTimeOptionSelected: {
    backgroundColor: MainColors.primaryBright,
  },
  reminderTimeOptionText: {
    color: MainColors.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  reminderTimeOptionTextSelected: {
    color: MainColors.text,
    fontWeight: "900",
  },
  addReminderButton: {
    minHeight: 44,
    marginTop: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: MainColors.border,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addReminderButtonText: {
    color: MainColors.primary,
    fontSize: 14,
    fontWeight: "800",
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

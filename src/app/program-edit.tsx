import { EditableExerciseRow } from "@/features/programs/components/editable-exercise-row";
import { ProgramEditFeedbackDialog } from "@/features/programs/components/program-edit-feedback-dialog";
import {
  clearProgramEditDraft,
  createProgramEditDraft,
  getProgramEditDraft,
  removeDraftExercise,
  reorderDraftExercise,
  saveProgramEditDraft,
  type ProgramEditDraft,
} from "@/features/programs/program-edit-draft";
import {
  isProgramFormValid,
  toggleSelection,
  TRAINING_DAY_OPTIONS,
} from "@/features/programs/program-domain";
import { getCurrentWeek } from "@/features/programs/program-dashboard";
import {
  isValidProgramId,
  programRepository,
  ProgramRepositoryError,
} from "@/features/programs/program-repository";
import { saveInitialProgramExerciseWeight } from "@/features/progress/progress-storage";
import { MainColors } from "@/shared/constants/theme";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type LoadState = "loading" | "success" | "not-found" | "error";

const REMINDER_TIMES = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ProgramEditScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const params = useLocalSearchParams<{
    programId?: string | string[];
    selectedDate?: string | string[];
  }>();
  const programId = singleParam(params.programId)?.trim() ?? "";
  const selectedDate = singleParam(params.selectedDate);
  const selectedTrainingDay = useMemo(
    () =>
      selectedDate
        ? (getCurrentWeek().find((day) => day.dateKey === selectedDate)?.day ?? null)
        : null,
    [selectedDate],
  );
  const [draft, setDraft] = useState<ProgramEditDraft | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState(["18:00"]);
  const [reminderListOpen, setReminderListOpen] = useState<number | null>(null);
  const mutationLock = useRef(false);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
    },
    [],
  );

  const loadProgram = useCallback(async () => {
    if (!isValidProgramId(programId)) {
      setLoadState("not-found");
      return;
    }

    const existingDraft = getProgramEditDraft(programId);
    if (existingDraft) {
      setDraft(existingDraft);
      setLoadState("success");
      return;
    }

    setLoadState("loading");
    try {
      const program = await programRepository.getProgramById(programId);
      if (!program) {
        setLoadState("not-found");
        return;
      }
      const nextDraft = saveProgramEditDraft(createProgramEditDraft(program));
      setDraft(nextDraft);
      setLoadState("success");
    } catch {
      setLoadState("error");
    }
  }, [programId]);

  useFocusEffect(
    useCallback(() => {
      mutationLock.current = false;
      void loadProgram();
    }, [loadProgram]),
  );

  const updateDraft = useCallback((nextDraft: ProgramEditDraft) => {
    const savedDraft = saveProgramEditDraft(nextDraft);
    setDraft(savedDraft);
  }, []);

  const canSave = useMemo(
    () =>
      Boolean(
        draft &&
          isProgramFormValid(
            draft.name,
            new Set(draft.trainingDays),
            new Set(draft.muscleGroupIds),
          ) &&
          !isSaving &&
          !isDeleting,
      ),
    [draft, isDeleting, isSaving],
  );

  const returnToPrograms = useCallback(
    (activeProgramId?: string) => {
      router.replace({
        pathname: "/(main)/program",
        params: {
          ...(selectedDate ? { selectedDate } : {}),
          ...(activeProgramId ? { activeProgramId } : {}),
        },
      });
    },
    [selectedDate],
  );

  const handleBack = useCallback(() => {
    if (programId) clearProgramEditDraft(programId);
    returnToPrograms(programId || undefined);
  }, [programId, returnToPrograms]);

  const handleDayToggle = useCallback(
    (day: ProgramEditDraft["trainingDays"][number]) => {
      if (!draft) return;
      updateDraft({
        ...draft,
        trainingDays: [...toggleSelection(new Set(draft.trainingDays), day)],
      });
    },
    [draft, updateDraft],
  );

  const handleRemoveExercise = useCallback(
    (relationId: string) => {
      if (draft) updateDraft(removeDraftExercise(draft, relationId));
    },
    [draft, updateDraft],
  );

  const handleMoveExercise = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (draft) updateDraft(reorderDraftExercise(draft, fromIndex, toIndex));
    },
    [draft, updateDraft],
  );

  const handleAddExercise = useCallback(() => {
    if (!draft) return;
    saveProgramEditDraft(draft);
    router.push({
      pathname: "/exercise",
      params: {
        selectionMode: "program-edit",
        editProgramId: draft.programId,
        ...(selectedDate ? { selectedDate } : {}),
      },
    });
  }, [draft, selectedDate]);

  const handleSave = useCallback(async () => {
    if (!draft || !canSave || mutationLock.current) return;
    mutationLock.current = true;
    setIsSaving(true);
    setNameTouched(true);
    try {
      const updated = await programRepository.updateProgram({
        id: draft.programId,
        name: draft.name.trim(),
        trainingDays: draft.trainingDays,
        muscleGroupIds: draft.muscleGroupIds,
        exercises: draft.exercises,
      });
      const initialWeightExercises = draft.exercises.filter(
        (exercise) => exercise.weightKg !== undefined,
      );
      const weightSaveResults = await Promise.allSettled(
        initialWeightExercises.map((exercise) =>
          saveInitialProgramExerciseWeight(
            updated,
            exercise.exerciseId,
            exercise.weightKg,
          ),
        ),
      );
      clearProgramEditDraft(draft.programId);
      if (
        weightSaveResults.some((result) => result.status === "rejected")
      ) {
        Alert.alert(
          "Kilo kaydı tamamlanamadı",
          "Program güncellendi ancak başlangıç kilosu kaydedilemedi. Hareket Kilolarını Güncelle ekranından tekrar deneyin.",
          [{ text: "Tamam", onPress: () => returnToPrograms(updated.id) }],
        );
        return;
      }
      setSaveSuccessVisible(true);
      navigationTimerRef.current = setTimeout(
        () => returnToPrograms(updated.id),
        1600,
      );
    } catch (error) {
      Alert.alert(
        "Program güncellenemedi",
        error instanceof ProgramRepositoryError
          ? error.message
          : "Bağlantınızı kontrol edip tekrar deneyin.",
      );
      mutationLock.current = false;
    } finally {
      setIsSaving(false);
    }
  }, [canSave, draft, returnToPrograms]);

  const confirmDelete = useCallback(() => {
    if (!draft || isSaving || isDeleting) return;
    setDeleteDialogVisible(true);
  }, [draft, isDeleting, isSaving]);

  const deleteProgram = useCallback(async () => {
    if (!draft || mutationLock.current) return;
    mutationLock.current = true;
    setIsDeleting(true);
    try {
      await programRepository.deleteProgram(draft.programId);
      clearProgramEditDraft(draft.programId);
      setDeleteDialogVisible(false);
      returnToPrograms();
    } catch (error) {
      Alert.alert(
        "Program silinemedi",
        error instanceof ProgramRepositoryError
          ? error.message
          : "Bağlantınızı kontrol edip tekrar deneyin.",
      );
      mutationLock.current = false;
    } finally {
      setIsDeleting(false);
    }
  }, [draft, returnToPrograms]);

  if (loadState !== "success" || !draft) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header onBack={handleBack} />
        <View style={styles.centerState}>
          {loadState === "loading" ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={40} color={colors.primary} />
              <Text style={styles.stateTitle}>
                {loadState === "not-found" ? "Program bulunamadı" : "Program alınamadı"}
              </Text>
              <Text style={styles.stateText}>
                {loadState === "not-found"
                  ? "Program bağlantısı geçersiz veya program artık mevcut değil."
                  : "Bağlantınızı kontrol edip tekrar deneyin."}
              </Text>
              {loadState === "error" ? (
                <Pressable onPress={() => void loadProgram()} style={styles.retryButton}>
                  <Text style={styles.retryText}>Yeniden dene</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProgramEditFeedbackDialog
        busy={isDeleting}
        mode="delete"
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={() => void deleteProgram()}
        programName={draft.name.trim()}
        visible={deleteDialogVisible}
      />
      <ProgramEditFeedbackDialog mode="saved" visible={saveSuccessVisible} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <Header onBack={handleBack} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isDragging}
          showsVerticalScrollIndicator={false}
        >
          <FormLabel>PROGRAM ADI</FormLabel>
          <TextInput
            accessibilityLabel="Program adı"
            maxLength={60}
            onBlur={() => setNameTouched(true)}
            onChangeText={(name) => updateDraft({ ...draft, name })}
            placeholder="Program adı"
            placeholderTextColor={colors.placeholder}
            returnKeyType="done"
            style={[
              styles.nameInput,
              nameTouched && !draft.name.trim() && styles.inputError,
            ]}
            value={draft.name}
          />
          {nameTouched && !draft.name.trim() ? (
            <Text style={styles.validationText}>Program adı zorunludur.</Text>
          ) : null}

          <FormLabel>HANGİ GÜNLER YAPILACAK?</FormLabel>
          <View style={styles.dayGrid}>
            {selectedTrainingDay
              ? TRAINING_DAY_OPTIONS.filter(
                  (day) => day.id === selectedTrainingDay,
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
              : TRAINING_DAY_OPTIONS.map((day) => {
                  const selected = draft.trainingDays.includes(day.id);
                  return (
                    <ChoiceChip
                      key={day.id}
                      label={day.shortLabel}
                      onPress={() => handleDayToggle(day.id)}
                      selected={selected}
                      style={styles.dayChip}
                    />
                  );
                })}
          </View>
          {draft.trainingDays.length === 0 ? (
            <Text style={styles.validationText}>En az bir gün seçmelisiniz.</Text>
          ) : null}

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
              style={({ pressed }) => [styles.reminderHeader, pressed && styles.pressed]}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <View style={styles.reminderTitleContent}>
                <Text style={styles.reminderTitle}>Antrenman Hatırlatıcısı</Text>
                <Text style={styles.reminderDescription}>Antrenman saatinde bildirim al.</Text>
              </View>
              <View style={styles.reminderToggleLabel}>
                <View style={[styles.reminderStatusDot, reminderEnabled && styles.reminderStatusDotActive]} />
                <Text style={[styles.reminderToggleText, reminderEnabled && styles.reminderToggleTextActive]}>
                  {reminderEnabled ? "Açık" : "Aç/Kapat"}
                </Text>
              </View>
            </Pressable>

            {reminderEnabled ? (
              <View style={styles.reminderExpanded}>
                <Text style={styles.reminderTimeLabel}>Hatırlatma saatleri</Text>
                {reminderTimes.map((reminderTime, index) => (
                  <View key={`${index}-${reminderTime}`}>
                    <View style={styles.reminderTimeRow}>
                      <Pressable
                        accessibilityLabel={`Hatırlatma saati ${reminderTime}. Saat listesini aç`}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: reminderListOpen === index }}
                        onPress={() => setReminderListOpen((openIndex) => openIndex === index ? null : index)}
                        style={({ pressed }) => [styles.selectedReminderTime, pressed && styles.pressed]}
                      >
                        <Ionicons name="time-outline" size={21} color={colors.primary} />
                        <Text style={styles.selectedReminderTimeText}>{reminderTime}</Text>
                        <Ionicons name={reminderListOpen === index ? "chevron-up" : "chevron-down"} size={19} color={colors.textSecondary} />
                      </Pressable>
                      {index > 0 ? (
                        <Pressable
                          accessibilityLabel={`${reminderTime} hatırlatmasını kaldır`}
                          accessibilityRole="button"
                          onPress={() => {
                            setReminderTimes((times) => times.filter((_, itemIndex) => itemIndex !== index));
                            setReminderListOpen(null);
                          }}
                          style={({ pressed }) => [styles.removeReminderButton, pressed && styles.pressed]}
                        >
                          <Ionicons name="close" size={19} color={colors.textSecondary} />
                        </Pressable>
                      ) : null}
                    </View>
                    {reminderListOpen === index ? (
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.reminderTimes}>
                        {REMINDER_TIMES.filter((time) => time === reminderTime || !reminderTimes.includes(time)).map((time) => {
                          const selected = reminderTime === time;
                          return (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              key={time}
                              onPress={() => {
                                setReminderTimes((times) => times.map((currentTime, itemIndex) => itemIndex === index ? time : currentTime));
                                setReminderListOpen(null);
                              }}
                              style={({ pressed }) => [styles.reminderTimeOption, selected && styles.reminderTimeOptionSelected, pressed && styles.pressed]}
                            >
                              <Text style={[styles.reminderTimeOptionText, selected && styles.reminderTimeOptionTextSelected]}>{time}</Text>
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
                      const nextTime = REMINDER_TIMES.find((time) => !reminderTimes.includes(time));
                      if (!nextTime) return;
                      setReminderTimes((times) => [...times, nextTime]);
                      setReminderListOpen(reminderTimes.length);
                    }}
                    style={({ pressed }) => [styles.addReminderButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="add" size={19} color={colors.primary} />
                    <Text style={styles.addReminderButtonText}>Saat ekle</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <FormLabel>EGZERSİZLER</FormLabel>
          <View style={styles.exerciseList}>
            {draft.exercises.map((exercise, index) => (
              <EditableExerciseRow
                exercise={exercise}
                index={index}
                key={exercise.id}
                onDragStateChange={setIsDragging}
                onMove={handleMoveExercise}
                onRemove={handleRemoveExercise}
                total={draft.exercises.length}
              />
            ))}
          </View>
          {draft.exercises.length === 0 ? (
            <Text style={styles.emptyExercises}>Bu programda egzersiz bulunmuyor.</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={handleAddExercise}
            style={({ pressed }) => [styles.addExerciseButton, pressed && styles.pressed]}
          >
            <Text style={styles.addExerciseText}>Egzersiz ekle</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.disabledButton,
              pressed && canSave && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Değişiklikleri kaydet</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving || isDeleting }}
            disabled={isSaving || isDeleting}
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            {isDeleting ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.deleteButtonText}>Programı sil</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Programlara geri dön"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Programı düzenle</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function FormLabel({ children }: { children: string }) {
  const styles = useThemedScreenStyles(baseStyles);
  return <Text style={styles.formLabel}>{children}</Text>;
}

function ChoiceChip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: object;
}) {
  const styles = useThemedScreenStyles(baseStyles);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceChip,
        style,
        selected && styles.choiceChipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={2} style={[styles.choiceText, selected && styles.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  keyboardView: { flex: 1 },
  header: {
    width: "100%",
    maxWidth: 680,
    height: 72,
    paddingHorizontal: 14,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 21,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: MainColors.mutedText, fontSize: 16, fontWeight: "600" },
  headerSpacer: { width: 42 },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingBottom: 34,
  },
  formLabel: { marginTop: 24, marginBottom: 9, color: MainColors.mutedText, fontSize: 14, fontWeight: "700" },
  nameInput: {
    height: 58,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    color: MainColors.text,
    fontSize: 16,
  },
  inputError: { borderColor: "#FF4D55" },
  validationText: { marginTop: 7, color: "#D14343", fontSize: 12, fontWeight: "600" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dayChip: { width: "22.5%", minWidth: 70, flexGrow: 1 },
  fixedDayChip: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: MainColors.primaryBright,
    borderRadius: 22,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedDayText: { color: MainColors.text, fontSize: 15, fontWeight: "700" },
  reminderCard: { marginTop: 20, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 20, backgroundColor: MainColors.surface, overflow: "hidden" },
  reminderHeader: { minHeight: 78, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  reminderTitleContent: { flex: 1 },
  reminderTitle: { color: MainColors.text, fontSize: 15, fontWeight: "800" },
  reminderDescription: { marginTop: 3, color: MainColors.mutedText, fontSize: 12 },
  reminderToggleLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  reminderStatusDot: { width: 11, height: 11, borderWidth: 1.5, borderColor: MainColors.mutedText, borderRadius: 6 },
  reminderStatusDotActive: { borderColor: MainColors.primary, backgroundColor: MainColors.primary },
  reminderToggleText: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  reminderToggleTextActive: { color: MainColors.primary },
  reminderExpanded: { paddingHorizontal: 18, paddingBottom: 16, borderTopWidth: 1, borderTopColor: MainColors.subtleBorder },
  reminderTimeLabel: { marginTop: 14, color: MainColors.mutedText, fontSize: 13, fontWeight: "800" },
  reminderTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectedReminderTime: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  selectedReminderTimeText: { flex: 1, color: MainColors.text, fontSize: 16, fontWeight: "800" },
  removeReminderButton: { width: 38, height: 38, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reminderTimes: { maxHeight: 240, marginBottom: 2, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 14 },
  reminderTimeOption: { width: "100%", minHeight: 46, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: MainColors.subtleBorder, alignItems: "center", justifyContent: "center" },
  reminderTimeOptionSelected: { backgroundColor: MainColors.primaryBright },
  reminderTimeOptionText: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  reminderTimeOptionTextSelected: { color: MainColors.text, fontWeight: "900" },
  addReminderButton: { minHeight: 44, marginTop: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: MainColors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  addReminderButtonText: { color: MainColors.primary, fontSize: 14, fontWeight: "800" },
  choiceChip: {
    minHeight: 44,
    maxWidth: "100%",
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceChipSelected: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.primaryBright },
  choiceText: { color: MainColors.mutedText, fontSize: 15, fontWeight: "700", textAlign: "center" },
  choiceTextSelected: { color: MainColors.text },
  exerciseList: { gap: 10 },
  emptyExercises: { paddingVertical: 12, color: MainColors.mutedText, textAlign: "center" },
  addExerciseButton: {
    minHeight: 54,
    marginTop: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: MainColors.border,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addExerciseText: { color: MainColors.primary, fontSize: 15, fontWeight: "800" },
  saveButton: {
    minHeight: 58,
    marginTop: 28,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { backgroundColor: MainColors.border, opacity: 0.72 },
  saveButtonText: { color: MainColors.text, fontSize: 16, fontWeight: "900" },
  deleteButton: {
    minHeight: 58,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: "#FF4D55",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: { color: "#FF4D55", fontSize: 16, fontWeight: "800" },
  centerState: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  stateTitle: { color: MainColors.text, fontSize: 20, fontWeight: "900", textAlign: "center" },
  stateText: { color: MainColors.mutedText, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 46, paddingHorizontal: 22, borderRadius: 18, backgroundColor: MainColors.primaryBright, justifyContent: "center" },
  retryText: { color: MainColors.text, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});

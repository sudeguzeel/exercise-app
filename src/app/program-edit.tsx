import { EditableExerciseRow } from "@/features/programs/components/editable-exercise-row";
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
import {
  isValidProgramId,
  programRepository,
  ProgramRepositoryError,
} from "@/features/programs/program-repository";
import { MainColors } from "@/shared/constants/theme";
import {
  getBodyParts,
  type BodyPartOption,
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ProgramEditScreen() {
  const params = useLocalSearchParams<{
    programId?: string | string[];
    selectedDate?: string | string[];
  }>();
  const programId = singleParam(params.programId)?.trim() ?? "";
  const selectedDate = singleParam(params.selectedDate);
  const [draft, setDraft] = useState<ProgramEditDraft | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<BodyPartOption[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const mutationLock = useRef(false);

  const loadProgram = useCallback(async () => {
    if (!isValidProgramId(programId)) {
      setLoadState("not-found");
      return;
    }

    const existingDraft = getProgramEditDraft(programId);
    if (existingDraft) {
      setDraft(existingDraft);
      setLoadState("success");
      setMuscleGroups(await getBodyParts());
      return;
    }

    setLoadState("loading");
    try {
      const [program, groups] = await Promise.all([
        programRepository.getProgramById(programId),
        getBodyParts(),
      ]);
      if (!program) {
        setLoadState("not-found");
        return;
      }
      const nextDraft = saveProgramEditDraft(createProgramEditDraft(program));
      setDraft(nextDraft);
      setMuscleGroups(groups);
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

  const handleMuscleToggle = useCallback(
    (muscleGroupId: string) => {
      if (!draft) return;
      updateDraft({
        ...draft,
        muscleGroupIds: [
          ...toggleSelection(new Set(draft.muscleGroupIds), muscleGroupId),
        ],
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
      clearProgramEditDraft(draft.programId);
      Alert.alert("Değişiklikler kaydedildi", "Programınız başarıyla güncellendi.", [
        { text: "Tamam", onPress: () => returnToPrograms(updated.id) },
      ]);
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
    Alert.alert(
      "Programı sil",
      `“${draft.name.trim() || "Bu program"}” kalıcı olarak silinsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Programı sil",
          style: "destructive",
          onPress: () => {
            if (mutationLock.current) return;
            mutationLock.current = true;
            setIsDeleting(true);
            void programRepository
              .deleteProgram(draft.programId)
              .then(() => {
                clearProgramEditDraft(draft.programId);
                returnToPrograms();
              })
              .catch((error: unknown) => {
                Alert.alert(
                  "Program silinemedi",
                  error instanceof ProgramRepositoryError
                    ? error.message
                    : "Bağlantınızı kontrol edip tekrar deneyin.",
                );
                mutationLock.current = false;
              })
              .finally(() => setIsDeleting(false));
          },
        },
      ],
    );
  }, [draft, isDeleting, isSaving, returnToPrograms]);

  if (loadState !== "success" || !draft) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header onBack={handleBack} />
        <View style={styles.centerState}>
          {loadState === "loading" ? (
            <ActivityIndicator color={MainColors.primary} size="large" />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={40} color={MainColors.primary} />
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
            placeholderTextColor={MainColors.mutedText}
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
            {TRAINING_DAY_OPTIONS.map((day) => {
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

          <FormLabel>ODAKLANILAN KAS GRUPLARI</FormLabel>
          {muscleGroups.length > 0 ? (
            <View style={styles.chipWrap}>
              {muscleGroups.map((muscle) => (
                <ChoiceChip
                  key={muscle.id}
                  label={muscle.name}
                  onPress={() => handleMuscleToggle(muscle.id)}
                  selected={draft.muscleGroupIds.includes(muscle.id)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.stateText}>Kas grupları yüklenemedi.</Text>
          )}
          {draft.muscleGroupIds.length === 0 ? (
            <Text style={styles.validationText}>En az bir kas grubu seçmelisiniz.</Text>
          ) : null}

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
              <ActivityIndicator color={MainColors.text} />
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
              <ActivityIndicator color="#FF4D55" />
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
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Programlara geri dön"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={MainColors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Programı düzenle</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function FormLabel({ children }: { children: string }) {
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

const styles = StyleSheet.create({
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
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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

import {
  parseInitialTrainingDay,
  parseProgramSelectionParams,
  serializeProgramSelectionPayload,
  type ProgramSelectionSearchParams,
} from "@/features/exercises/program-selection";
import { ProgramCard } from "@/features/programs/components/program-card";
import { ProgramFlowHeader } from "@/features/programs/components/program-flow-header";
import { ProgramResultModal } from "@/features/programs/components/program-result-modal";
import {
  buildAddResultPresentation,
  removeMissingProgramSelections,
  toggleSelection,
  type ProgramResultPresentation,
} from "@/features/programs/program-domain";
import { programRepository } from "@/features/programs/program-repository";
import type { UserProgram } from "@/features/programs/types";
import { MainColors } from "@/shared/constants/theme";
import {
  getBodyParts,
  getExerciseSummary,
  type BodyPartOption,
  type ExerciseSummary,
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ResultModalState = {
  presentation: ProgramResultPresentation;
  success: boolean;
};

export default function ProgramSelectionScreen() {
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
  const [categories, setCategories] = useState<BodyPartOption[]>([]);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

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

  useEffect(() => {
    void getBodyParts().then(setCategories);
  }, []);

  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(
    new Set(),
  );
  const [listState, setListState] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<ResultModalState | null>(
    null,
  );
  const hasRedirectedToNewProgram = useRef(false);

  useEffect(() => {
    if (
      hasRedirectedToNewProgram.current ||
      !selection ||
      !exercise ||
      !initialTrainingDay
    ) {
      return;
    }

    hasRedirectedToNewProgram.current = true;
    router.replace({
      pathname: "/new-program",
      params: serializeProgramSelectionPayload(selection, initialTrainingDay),
    });
  }, [exercise, initialTrainingDay, selection]);

  const loadPrograms = useCallback(async () => {
    setListState("loading");
    try {
      const nextPrograms = await programRepository.listPrograms();
      setPrograms(nextPrograms);
      setListState("success");
    } catch {
      setListState("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPrograms();
    }, [loadPrograms]),
  );

  useEffect(() => {
    setSelectedProgramIds((currentSelection) =>
      removeMissingProgramSelections(currentSelection, programs),
    );
  }, [programs]);

  const toggleProgram = useCallback((programId: string) => {
    setSelectedProgramIds((currentSelection) =>
      toggleSelection(currentSelection, programId),
    );
  }, []);

  const handleAddToPrograms = useCallback(async () => {
    if (
      !selection ||
      !exercise ||
      selectedProgramIds.size === 0 ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await programRepository.addExerciseToPrograms(
        [...selectedProgramIds],
        selection,
      );
      const presentation = buildAddResultPresentation(result);
      setResultModal({
        presentation,
        success: result.results.some((item) => item.status === "added"),
      });
    } catch {
      setResultModal({
        presentation: {
          title: "Egzersiz eklenemedi",
          message:
            "Programlar güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.",
          groups: [],
        },
        success: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    exercise,
    isSubmitting,
    selectedProgramIds,
    selection,
  ]);

  const handleNewProgram = useCallback(() => {
    if (!selection || !exercise) return;
    router.push({
      pathname: "/new-program",
      params: serializeProgramSelectionPayload(selection, initialTrainingDay),
    });
  }, [exercise, initialTrainingDay, selection]);

  const handleResultConfirm = useCallback(() => {
    setResultModal(null);
    router.replace("/exercise");
  }, []);

  const isRouteValid = Boolean(selection && exercise);
  const canSubmit =
    isRouteValid &&
    listState === "success" &&
    selectedProgramIds.size > 0 &&
    !isSubmitting;

  if (initialTrainingDay && isRouteValid) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.redirectState}>
          <ActivityIndicator color={MainColors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <ProgramFlowHeader
              onBack={() => router.back()}
              title="Programa ekle"
            />

            {isRouteValid && exercise ? (
              <>
                <View style={styles.intro}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={2}
                    style={styles.exerciseName}
                  >
                    {exercise.name.toLocaleUpperCase("tr-TR")}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.description}>
                    Bu egzersizi seç ve programlarından istediklerine ekle.
                  </Text>
                </View>

                <View style={styles.programList}>
                  {listState === "loading" ? (
                    <View style={styles.stateCard}>
                      <ActivityIndicator
                        color={MainColors.primary}
                        size="large"
                      />
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.stateText}
                      >
                        Programlar yükleniyor...
                      </Text>
                    </View>
                  ) : null}

                  {listState === "error" ? (
                    <View style={styles.stateCard}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={34}
                        color={MainColors.primary}
                      />
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.stateTitle}
                      >
                        Programlar alınamadı
                      </Text>
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.stateText}
                      >
                        Bağlantınızı kontrol edip yeniden deneyin.
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void loadPrograms()}
                        style={({ pressed }) => [
                          styles.retryButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.retryButtonText}>Yeniden dene</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {listState === "success" && programs.length === 0 ? (
                    <View style={styles.stateCard}>
                      <Ionicons
                        name="document-text-outline"
                        size={34}
                        color={MainColors.primary}
                      />
                      <Text
                        maxFontSizeMultiplier={1.3}
                        style={styles.stateTitle}
                      >
                        Henüz bir programınız bulunmuyor.
                      </Text>
                    </View>
                  ) : null}

                  {listState === "success"
                    ? programs.map((program) => (
                        <ProgramCard
                          categoryLabel={getProgramCategoryLabel(
                            program,
                            categoryNames,
                          )}
                          key={program.id}
                          onPress={toggleProgram}
                          program={program}
                          selected={selectedProgramIds.has(program.id)}
                        />
                      ))
                    : null}
                </View>

                <Pressable
                  accessibilityLabel="Yeni program oluştur"
                  accessibilityRole="button"
                  onPress={handleNewProgram}
                  style={({ pressed }) => [
                    styles.newProgramButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color={MainColors.primary}
                  />
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={styles.newProgramText}
                  >
                    Yeni program oluştur
                  </Text>
                </Pressable>
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
                  Egzersizi tekrar seçerek programa ekleme işlemini
                  başlatabilirsiniz.
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
                accessibilityLabel="Seçili programlara ekle"
                accessibilityRole="button"
                accessibilityState={{
                  busy: isSubmitting,
                  disabled: !canSubmit,
                }}
                disabled={!canSubmit}
                onPress={() => void handleAddToPrograms()}
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
                    Seçili programlara ekle
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <ProgramResultModal
        groups={resultModal?.presentation.groups}
        message={resultModal?.presentation.message ?? ""}
        onConfirm={handleResultConfirm}
        success={resultModal?.success}
        title={resultModal?.presentation.title ?? ""}
        visible={resultModal !== null}
      />
    </SafeAreaView>
  );
}

function getProgramCategoryLabel(
  program: UserProgram,
  categoryNames: Map<string, string>,
) {
  const names = program.muscleGroupIds
    .map((id) => categoryNames.get(id))
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) return "Genel";
  if (names.length <= 2) return names.join(" & ");
  return names.slice(0, 2).join(" & ");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MainColors.background,
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 116,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  intro: {
    marginTop: 40,
  },
  exerciseName: {
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },
  description: {
    marginTop: 5,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  programList: {
    marginTop: 22,
    gap: 12,
  },
  stateCard: {
    minHeight: 148,
    padding: 22,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    marginTop: 10,
    color: MainColors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    marginTop: 8,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 44,
    marginTop: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: MainColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  newProgramButton: {
    minHeight: 94,
    marginTop: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  newProgramText: {
    color: MainColors.primary,
    fontSize: 16,
    fontWeight: "900",
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
  redirectState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

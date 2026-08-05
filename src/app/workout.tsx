import {
  ExerciseInfoCard,
  ExerciseMedia,
  RepetitionCounter,
  SetSelector,
  WeightInput,
  WorkoutTopBar,
} from "@/features/workouts/components/active-workout-components";
import {
  findFirstIncompleteSet,
  findSetPosition,
  formatElapsedDuration,
  getElapsedDurationMs,
  validateWeightInput,
} from "@/features/workouts/workout-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutSession } from "@/features/workouts/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    workoutSessionId?: string | string[];
  }>();
  const workoutSessionId =
    singleParam(params.workoutSessionId)?.trim() ?? "";
  const [session, setSession] = useState<WorkoutSession | null | undefined>(
    undefined,
  );
  const [viewedSetId, setViewedSetId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const isSavingRef = useRef(false);
  const exitPromptOpenRef = useRef(false);
  const draftQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const appStateQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const replaceWithCompletion = useCallback(() => {
    router.replace({
      pathname: "/workout-complete",
      params: { workoutSessionId },
    });
  }, [workoutSessionId]);

  const loadSession = useCallback(async () => {
    if (!isValidWorkoutSessionId(workoutSessionId)) {
      setSession(null);
      setLoadError("Antrenman bağlantısı geçersiz.");
      return;
    }

    setSession(undefined);
    setLoadError(null);
    try {
      const completion = await workoutRepository.getCompletion(workoutSessionId);
      if (completion) {
        replaceWithCompletion();
        return;
      }
      let nextSession = await workoutRepository.getSession(workoutSessionId);
      if (!nextSession) {
        setSession(null);
        setLoadError("Antrenman oturumu bulunamadı.");
        return;
      }
      if (nextSession.status === "paused") {
        nextSession = await workoutRepository.resumeSession(workoutSessionId);
      }
      const active = findFirstIncompleteSet(nextSession);
      const initialSet =
        active?.set ?? nextSession.exercises.at(-1)?.sets.at(-1) ?? null;
      sessionRef.current = nextSession;
      setSession(nextSession);
      setViewedSetId(initialSet?.id ?? "");
      setNow(Date.now());
      if (!active) {
        setCompletionError(
          "Setler tamamlandı. Antrenman kaydını bitirmek için tekrar deneyin.",
        );
      }
    } catch {
      setSession(null);
      setLoadError("Antrenman yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.");
    }
  }, [replaceWithCompletion, workoutSessionId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadSession();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSession]);

  useEffect(() => {
    sessionRef.current = session ?? null;
  }, [session]);

  useEffect(() => {
    if (session?.status !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session?.status]);

  useEffect(() => {
    if (!isValidWorkoutSessionId(workoutSessionId)) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateQueueRef.current = appStateQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const current = sessionRef.current;
          if (!current || current.status === "completed") return;
          await draftQueueRef.current.catch(() => undefined);
          const updated =
            nextState === "active"
              ? await workoutRepository.resumeSession(workoutSessionId)
              : current.status === "active"
                ? await workoutRepository.pauseSession(workoutSessionId)
                : current;
          sessionRef.current = updated;
          if (mountedRef.current) setSession(updated);
        })
        .catch(() => undefined);
    });
    return () => subscription.remove();
  }, [workoutSessionId]);

  const leaveWorkout = useCallback(async () => {
    try {
      if (isValidWorkoutSessionId(workoutSessionId)) {
        await draftQueueRef.current.catch(() => undefined);
        const active = sessionRef.current
          ? findFirstIncompleteSet(sessionRef.current)
          : null;
        if (active) {
          await workoutRepository.updateSetDraft(
            workoutSessionId,
            active.set.id,
            {
              actualReps: active.set.actualReps,
              weightInput: active.set.weightInput,
            },
          );
        }
        await workoutRepository.pauseSession(workoutSessionId);
      }
      const current = sessionRef.current;
      router.replace({
        pathname: "/(main)/program",
        params: {
          ...(current?.workoutDate
            ? { selectedDate: current.workoutDate }
            : {}),
          ...(current?.programId
            ? { activeProgramId: current.programId }
            : {}),
        },
      });
    } catch {
      Alert.alert(
        "Antrenman kaydedilemedi",
        "Taslak bilgiler güvenli biçimde saklanamadığı için ekrandan çıkılmadı. Lütfen yeniden deneyin.",
      );
    }
  }, [workoutSessionId]);

  const requestExit = useCallback(() => {
    if (!sessionRef.current) {
      router.replace("/(main)/program");
      return;
    }
    if (exitPromptOpenRef.current || isSavingRef.current) return;
    exitPromptOpenRef.current = true;
    Alert.alert(
      "Antrenmandan çıkmak istiyor musun?",
      "Tamamladığın setler korunacak ancak antrenman tamamlanmış sayılmayacak.",
      [
        {
          text: "Antrenmana devam et",
          style: "cancel",
          onPress: () => {
            exitPromptOpenRef.current = false;
          },
        },
        {
          text: "Antrenmandan çık",
          style: "destructive",
          onPress: () => {
            exitPromptOpenRef.current = false;
            void leaveWorkout();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          exitPromptOpenRef.current = false;
        },
      },
    );
  }, [leaveWorkout]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestExit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [requestExit]);

  const activePosition = useMemo(
    () => (session ? findFirstIncompleteSet(session) : null),
    [session],
  );
  const viewedPosition = useMemo(() => {
    if (!session) return null;
    return findSetPosition(session, viewedSetId) ?? activePosition;
  }, [activePosition, session, viewedSetId]);
  const isViewedSetEditable = Boolean(
    activePosition && viewedPosition?.set.id === activePosition.set.id,
  );
  const weightValidation = viewedPosition
    ? validateWeightInput(viewedPosition.set.weightInput)
    : null;
  const weightError =
    weightValidation && !weightValidation.success && isViewedSetEditable
      ? weightValidation.message
      : null;
  const setActionDisabled = Boolean(
    isSaving ||
      (activePosition &&
        (!isViewedSetEditable || !weightValidation?.success)),
  );

  const updateDraft = useCallback(
    (actualReps: number, weightInput: string) => {
      const current = sessionRef.current;
      const active = current ? findFirstIncompleteSet(current) : null;
      if (!current || !active) return;

      const updated: WorkoutSession = {
        ...current,
        exercises: current.exercises.map((exercise, exerciseIndex) =>
          exerciseIndex !== active.exerciseIndex
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map((set, setIndex) =>
                  setIndex === active.setIndex
                    ? { ...set, actualReps, weightInput }
                    : set,
                ),
              },
        ),
      };
      sessionRef.current = updated;
      setSession(updated);
      draftQueueRef.current = draftQueueRef.current
        .catch(() => undefined)
        .then(() =>
          workoutRepository.updateSetDraft(
            workoutSessionId,
            active.set.id,
            { actualReps, weightInput },
          ),
        )
        .then(() => {
          if (mountedRef.current) setCompletionError(null);
        })
        .catch(() => {
          if (mountedRef.current) {
            setCompletionError(
              "Set taslağı kaydedilemedi. Değerlerin ekranda korunuyor; yeniden düzenleyerek tekrar deneyebilirsin.",
            );
          }
        });
    },
    [workoutSessionId],
  );

  const finishWorkout = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setCompletionError(null);
    try {
      await draftQueueRef.current.catch(() => undefined);
      await workoutRepository.completeWorkout(workoutSessionId);
      replaceWithCompletion();
    } catch {
      setCompletionError(
        "Antrenman kaydı tamamlanamadı. Verilerin korunuyor; yeniden deneyebilirsin.",
      );
    } finally {
      isSavingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  }, [replaceWithCompletion, workoutSessionId]);

  const completeCurrentSet = useCallback(async () => {
    if (isSavingRef.current) return;
    const current = sessionRef.current;
    const active = current ? findFirstIncompleteSet(current) : null;
    if (!current || !active) {
      await finishWorkout();
      return;
    }
    const validation = validateWeightInput(active.set.weightInput);
    if (!validation.success) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setCompletionError(null);
    try {
      await draftQueueRef.current.catch(() => undefined);
      const updated = await workoutRepository.completeSet({
        workoutSessionId,
        setId: active.set.id,
        actualReps: active.set.actualReps,
        weightKg: validation.value,
      });
      sessionRef.current = updated;
      setSession(updated);
      const next = findFirstIncompleteSet(updated);
      if (next) {
        setViewedSetId(next.set.id);
        if (next.exerciseIndex !== active.exerciseIndex) {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      } else {
        isSavingRef.current = false;
        setIsSaving(false);
        await finishWorkout();
        return;
      }
    } catch {
      setCompletionError(
        "Set kaydedilemedi. Girdiğin değerler korunuyor; yeniden deneyebilirsin.",
      );
    } finally {
      isSavingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  }, [finishWorkout, workoutSessionId]);

  if (session === undefined && !loadError) {
    return (
      <ScreenState>
        <ActivityIndicator color={MainColors.primary} size="large" />
        <Text style={styles.stateText}>Antrenman hazırlanıyor…</Text>
      </ScreenState>
    );
  }

  if (!session || loadError || !viewedPosition) {
    return (
      <ScreenState>
        <Ionicons name="alert-circle-outline" size={42} color={MainColors.primary} />
        <Text style={styles.stateTitle}>Antrenman açılamadı</Text>
        <Text style={styles.stateText}>{loadError ?? "Antrenman verisi eksik."}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void loadSession()}
          style={styles.statePrimaryButton}
        >
          <Text style={styles.statePrimaryText}>Yeniden dene</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={requestExit}>
          <Text style={styles.stateLink}>Programlara dön</Text>
        </Pressable>
      </ScreenState>
    );
  }

  const exercise = viewedPosition.exercise;
  const set = viewedPosition.set;
  const elapsed = formatElapsedDuration(getElapsedDurationMs(session, now));

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          <WorkoutTopBar elapsed={elapsed} onExit={requestExit} />
          <ExerciseInfoCard
            exercise={exercise}
            exerciseIndex={viewedPosition.exerciseIndex}
            totalExercises={session.exercises.length}
          />
          <ExerciseMedia
            exerciseName={exercise.name}
            mediaUrl={exercise.mediaUrl}
          />
          <SetSelector
            activeSetId={activePosition?.set.id ?? null}
            onSelect={(setId) => {
              setViewedSetId(setId);
            }}
            sets={exercise.sets}
            viewedSetId={set.id}
          />

          {!isViewedSetEditable && activePosition ? (
            <Text style={styles.readOnlyNote}>
              Tamamlanan set görüntüleniyor. Devam etmek için aktif sete dokun.
            </Text>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>TEKRAR SAYISI</Text>
            <RepetitionCounter
              disabled={!isViewedSetEditable || isSaving}
              onChange={(value) =>
                updateDraft(value, activePosition?.set.weightInput ?? "")
              }
              value={set.actualReps}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>KULLANDIĞIN AĞIRLIK</Text>
            <WeightInput
              disabled={!isViewedSetEditable || isSaving}
              error={weightError}
              onChange={(value) => {
                updateDraft(activePosition?.set.actualReps ?? set.actualReps, value);
              }}
              value={set.weightInput}
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          {completionError ? (
            <Text accessibilityLiveRegion="polite" style={styles.completionError}>
              {completionError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              busy: isSaving,
              disabled: setActionDisabled,
            }}
            disabled={setActionDisabled}
            onPress={() => void completeCurrentSet()}
            style={({ pressed }) => [
              styles.completeButton,
              setActionDisabled && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color={MainColors.text} />
            ) : (
              <Text style={styles.completeButtonText}>
                {activePosition
                  ? "Seti tamamla ✓"
                  : completionError
                    ? "Yeniden dene"
                    : "Antrenmanı kaydet"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScreenState({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.centerState}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 17,
    paddingBottom: 26,
    gap: 12,
  },
  fieldGroup: { marginTop: 2 },
  fieldLabel: {
    marginBottom: 10,
    color: MainColors.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  readOnlyNote: {
    color: MainColors.mutedText,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  stickyFooter: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 17,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MainColors.subtleBorder,
    backgroundColor: MainColors.background,
  },
  completionError: {
    marginBottom: 8,
    color: "#B73535",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  completeButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.48 },
  completeButtonText: {
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  pressed: { opacity: 0.72 },
  centerState: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateTitle: {
    color: MainColors.text,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    maxWidth: 360,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  statePrimaryButton: {
    minHeight: 48,
    marginTop: 8,
    paddingHorizontal: 24,
    borderRadius: 17,
    backgroundColor: MainColors.primaryBright,
    justifyContent: "center",
  },
  statePrimaryText: { color: MainColors.text, fontWeight: "900" },
  stateLink: { padding: 8, color: MainColors.primary, fontWeight: "800" },
});

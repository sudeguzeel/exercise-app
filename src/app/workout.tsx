import {
  ExerciseInfoCard,
  ExerciseMedia,
  SetSelector,
  TargetRepetitionCard,
  WorkoutTopBar,
} from "@/features/workouts/components/active-workout-components";
import {
  findFirstIncompleteSet,
  formatElapsedDuration,
  getElapsedDurationMs,
  getWorkoutProgress,
} from "@/features/workouts/workout-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutSession } from "@/features/workouts/types";
import { useWorkoutExit } from "@/features/workouts/use-workout-exit";
import { WorkoutExitDialog } from "@/features/workouts/components/workout-exit-dialog";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    workoutSessionId?: string | string[];
  }>();
  const workoutSessionId = singleParam(params.workoutSessionId)?.trim() ?? "";
  const [session, setSession] = useState<WorkoutSession | null | undefined>();
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const mountedRef = useRef(true);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const transitionInProgressRef = useRef(false);
  const completionNavigationRef = useRef(false);

  const replaceWithCompletion = useCallback(() => {
    if (completionNavigationRef.current) return;
    completionNavigationRef.current = true;
    router.replace({
      pathname: "/workout-complete",
      params: { workoutSessionId },
    });
  }, [workoutSessionId]);

  const replaceWithRest = useCallback(() => {
    router.replace({
      pathname: "/workout-rest",
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
    setActionError(null);
    try {
      let nextSession = await workoutRepository.getSession(workoutSessionId);
      if (!nextSession) {
        setSession(null);
        setLoadError("Antrenman oturumu bulunamadı.");
        return;
      }
      if (
        nextSession.status === "completed" ||
        nextSession.phase === "completed"
      ) {
        const completion = await workoutRepository.getCompletion(workoutSessionId);
        if (completion && getWorkoutProgress(nextSession.exercises).canFinalize) {
          replaceWithCompletion();
          return;
        }
        setSession(null);
        setLoadError(
          "Antrenman tamamlanma kaydı ilerleme verileriyle uyuşmuyor.",
        );
        return;
      }
      if (nextSession.status === "paused") {
        nextSession = await workoutRepository.resumeSession(workoutSessionId);
      }

      sessionRef.current = nextSession;
      if (nextSession.phase === "rest") {
        replaceWithRest();
        return;
      }
      if (
        nextSession.phase === "active" &&
        !findFirstIncompleteSet(nextSession)
      ) {
        setSession(null);
        setLoadError("Antrenmanın set bilgileri eksik veya geçersiz.");
        return;
      }

      setSession(nextSession);
      setNow(Date.now());
      if (nextSession.phase === "saving") {
        setSaveStatus("error");
        setActionError(
          "Setlerin tamamlandı. Antrenman kaydını bitirmek için tekrar dene.",
        );
      } else {
        setSaveStatus("idle");
      }
    } catch {
      setSession(null);
      setLoadError(
        "Antrenman yüklenemedi. Bağlantını kontrol edip yeniden dene.",
      );
    }
  }, [replaceWithCompletion, replaceWithRest, workoutSessionId]);

  useEffect(() => {
    mountedRef.current = true;
    completionNavigationRef.current = false;
    void loadSession();
    return () => {
      mountedRef.current = false;
    };
  }, [loadSession]);

  useEffect(() => {
    sessionRef.current = session ?? null;
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== "active") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  const { requestExit, exitDialogVisible, cancelExit, confirmExit } = useWorkoutExit({
    sessionRef,
    workoutSessionId,
    transitionInProgressRef,
  });

  const goBackOneStep = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    const current = sessionRef.current;
    const hasCompletedSet = current?.exercises.some((exercise) =>
      exercise.sets.some((item) => Boolean(item.completedAt)),
    );
    if (!current || !hasCompletedSet) {
      requestExit();
      return;
    }

    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    try {
      const updated = await workoutRepository.revertLastCompletedSet(workoutSessionId);
      sessionRef.current = updated;
      if (mountedRef.current) setSession(updated);
    } catch {
      setActionError("Önceki sete dönülemedi. Lütfen yeniden dene.");
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [requestExit, workoutSessionId]);

  const activePosition = useMemo(
    () => (session ? findFirstIncompleteSet(session) : null),
    [session],
  );

  const finishWorkout = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setSaveStatus("saving");
    setActionError(null);
    try {
      await workoutRepository.completeWorkout(workoutSessionId);
      setSaveStatus("saved");
      replaceWithCompletion();
    } catch {
      setSaveStatus("error");
      setActionError(
        "Antrenman kaydı tamamlanamadı. Verilerin korunuyor; yeniden deneyebilirsin.",
      );
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [replaceWithCompletion, workoutSessionId]);

  const completeCurrentSet = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    const current = sessionRef.current;
    const active = current ? findFirstIncompleteSet(current) : null;
    if (!current || current.phase !== "active" || !active) return;

    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    let finalizing = false;
    try {
      const updated = await workoutRepository.completeSet({
        workoutSessionId,
        setId: active.set.id,
      });
      sessionRef.current = updated;
      if (mountedRef.current) setSession(updated);

      if (updated.phase === "rest") {
        replaceWithRest();
        return;
      }

      finalizing = true;
      setSaveStatus("saving");
      await workoutRepository.completeWorkout(workoutSessionId);
      setSaveStatus("saved");
      replaceWithCompletion();
    } catch {
      if (finalizing) {
        setSaveStatus("error");
        setActionError(
          "Antrenman kaydı tamamlanamadı. Verilerin korunuyor; yeniden deneyebilirsin.",
        );
      } else {
        setActionError(
          "Set kaydedilemedi. İlerlemen korunuyor; yeniden deneyebilirsin.",
        );
      }
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [replaceWithCompletion, replaceWithRest, workoutSessionId]);

  if (session === undefined && !loadError) {
    return (
      <ScreenState>
        <ActivityIndicator color={MainColors.primary} size="large" />
        <Text style={styles.stateText}>Antrenman hazırlanıyor…</Text>
      </ScreenState>
    );
  }

  if (!session || loadError) {
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
          <Text style={styles.stateLink}>Ana sayfaya dön</Text>
        </Pressable>
      </ScreenState>
    );
  }

  if (session.phase === "saving" || !activePosition) {
    return (
      <ScreenState>
        {saveStatus === "saving" ? (
          <ActivityIndicator color={MainColors.primary} size="large" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={44} color={MainColors.primary} />
        )}
        <Text style={styles.stateTitle}>Antrenman kaydediliyor</Text>
        <Text accessibilityLiveRegion="polite" style={styles.stateText}>
          {actionError ?? "Sonucun güvenli biçimde kaydediliyor…"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isTransitioning, disabled: isTransitioning }}
          disabled={isTransitioning}
          onPress={() => void finishWorkout()}
          style={[styles.statePrimaryButton, isTransitioning && styles.disabledButton]}
        >
          <Text style={styles.statePrimaryText}>
            {isTransitioning ? "Kaydediliyor…" : "Tekrar dene"}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={requestExit}>
          <Text style={styles.stateLink}>Ana sayfaya dön</Text>
        </Pressable>
      </ScreenState>
    );
  }

  const exercise = activePosition.exercise;
  const set = activePosition.set;
  const elapsed = formatElapsedDuration(getElapsedDurationMs(session, now));

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <WorkoutExitDialog
        onCancel={cancelExit}
        onConfirm={confirmExit}
        visible={exitDialogVisible}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WorkoutTopBar
          elapsed={elapsed}
          onBack={() => void goBackOneStep()}
          onExit={requestExit}
        />
        <ExerciseInfoCard
          exercise={exercise}
          exerciseIndex={activePosition.exerciseIndex}
          totalExercises={session.exercises.length}
        />
        <ExerciseMedia exerciseName={exercise.name} mediaUrl={exercise.mediaUrl} />
        <SetSelector activeSetId={set.id} sets={exercise.sets} />
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>HEDEF TEKRAR</Text>
          <TargetRepetitionCard value={set.targetReps} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {actionError ? (
          <Text accessibilityLiveRegion="polite" style={styles.actionError}>
            {actionError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            busy: isTransitioning,
            disabled: isTransitioning,
          }}
          disabled={isTransitioning}
          onPress={() => void completeCurrentSet()}
          style={({ pressed }) => [
            styles.completeButton,
            isTransitioning && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          {isTransitioning ? (
            <ActivityIndicator color={MainColors.text} />
          ) : (
            <Text style={styles.completeButtonText}>Seti tamamla ✓</Text>
          )}
        </Pressable>
      </View>
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
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 17,
    paddingBottom: 24,
    gap: 12,
  },
  fieldGroup: { marginTop: 2 },
  fieldLabel: {
    marginBottom: 10,
    color: MainColors.mutedText,
    fontSize: 13,
    fontWeight: "700",
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
  actionError: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  statePrimaryText: { color: MainColors.text, fontWeight: "900" },
  stateLink: { padding: 8, color: MainColors.primary, fontWeight: "800" },
});

import { WorkoutTopBar } from "@/features/workouts/components/active-workout-components";
import {
  NextWorkoutCard,
  RestHeaderCard,
  RestProgressRing,
} from "@/features/workouts/components/rest-workout-components";
import {
  findPendingWorkoutTarget,
  findSetPosition,
  formatElapsedDuration,
  getElapsedDurationMs,
  getRestRemainingSeconds,
  MAX_REST_SECONDS,
} from "@/features/workouts/workout-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutSession } from "@/features/workouts/types";
import { useWorkoutExit } from "@/features/workouts/use-workout-exit";
import { WorkoutExitDialog } from "@/features/workouts/components/workout-exit-dialog";
import { MainColors } from "@/shared/constants/theme";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
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

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutRestScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    workoutSessionId?: string | string[];
  }>();
  const workoutSessionId = singleParam(params.workoutSessionId)?.trim() ?? "";
  const [session, setSession] = useState<WorkoutSession | null | undefined>();
  const [now, setNow] = useState(Date.now());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const mountedRef = useRef(true);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const transitionInProgressRef = useRef(false);
  const autoAdvanceAttemptedRef = useRef(false);
  const completionNavigationRef = useRef(false);

  const replaceWithWorkout = useCallback(() => {
    router.replace({ pathname: "/workout", params: { workoutSessionId } });
  }, [workoutSessionId]);

  const replaceWithCompletion = useCallback(() => {
    if (completionNavigationRef.current) return;
    completionNavigationRef.current = true;
    router.replace({
      pathname: "/workout-complete",
      params: { workoutSessionId },
    });
  }, [workoutSessionId]);

  const loadSession = useCallback(async () => {
    if (!isValidWorkoutSessionId(workoutSessionId)) {
      setSession(null);
      setLoadError("Dinlenme bağlantısı geçersiz.");
      return;
    }

    setSession(undefined);
    setLoadError(null);
    setActionError(null);
    autoAdvanceAttemptedRef.current = false;
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
        if (completion) {
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

      if (nextSession.phase !== "rest") {
        replaceWithWorkout();
        return;
      }
      if (
        !findPendingWorkoutTarget(nextSession) ||
        !nextSession.lastCompletedSetId ||
        !findSetPosition(nextSession, nextSession.lastCompletedSetId)
      ) {
        setSession(null);
        setLoadError("Dinlenme adımı için gerekli set bilgisi bulunamadı.");
        return;
      }

      setSession(nextSession);
      setNow(Date.now());
    } catch {
      setSession(null);
      setLoadError(
        "Dinlenme bilgileri yüklenemedi. Bağlantını kontrol edip yeniden dene.",
      );
    }
  }, [replaceWithCompletion, replaceWithWorkout, workoutSessionId]);

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
    if (!session || session.phase !== "rest") return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [session]);

  const { requestExit, exitDialogVisible, cancelExit, confirmExit } = useWorkoutExit({
    sessionRef,
    workoutSessionId,
    transitionInProgressRef,
  });

  const goBackOneStep = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    try {
      await workoutRepository.revertLastCompletedSet(workoutSessionId);
      replaceWithWorkout();
    } catch {
      setActionError("Önceki sete dönülemedi. Lütfen yeniden dene.");
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [replaceWithWorkout, workoutSessionId]);

  const remainingSeconds = session
    ? getRestRemainingSeconds(session.restEndsAt, now)
    : 0;

  const advanceToNextSet = useCallback(async () => {
    if (transitionInProgressRef.current) return;
    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    try {
      const updated = await workoutRepository.finishRest(workoutSessionId);
      sessionRef.current = updated;
      if (updated.phase === "completed") {
        const completion = await workoutRepository.getCompletion(workoutSessionId);
        if (!completion) {
          throw new Error("Tamamlanma kaydı ilerleme verileriyle uyuşmuyor.");
        }
        replaceWithCompletion();
      } else {
        replaceWithWorkout();
      }
    } catch {
      setActionError(
        "Sıradaki set açılamadı. İlerlemen korunuyor; yeniden deneyebilirsin.",
      );
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [replaceWithCompletion, replaceWithWorkout, workoutSessionId]);

  useEffect(() => {
    if (
      session?.phase !== "rest" ||
      remainingSeconds > 0 ||
      autoAdvanceAttemptedRef.current
    ) {
      return;
    }
    autoAdvanceAttemptedRef.current = true;
    void advanceToNextSet();
  }, [advanceToNextSet, remainingSeconds, session?.phase]);

  const extendRest = useCallback(async () => {
    if (transitionInProgressRef.current || remainingSeconds >= MAX_REST_SECONDS) {
      return;
    }
    transitionInProgressRef.current = true;
    setIsExtending(true);
    setActionError(null);
    try {
      const updated = await workoutRepository.extendRest(workoutSessionId, 15);
      sessionRef.current = updated;
      if (mountedRef.current) {
        setSession(updated);
        setNow(Date.now());
      }
    } catch {
      setActionError("Dinlenme süresi artırılamadı. Lütfen yeniden dene.");
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsExtending(false);
    }
  }, [remainingSeconds, workoutSessionId]);

  const completedPosition = useMemo(
    () =>
      session?.lastCompletedSetId
        ? findSetPosition(session, session.lastCompletedSetId)
        : null,
    [session],
  );
  const pendingPosition = useMemo(
    () => (session ? findPendingWorkoutTarget(session) : null),
    [session],
  );

  if (session === undefined && !loadError) {
    return (
      <ScreenState>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Dinlenme süresi hazırlanıyor…</Text>
      </ScreenState>
    );
  }

  if (!session || loadError || !completedPosition || !pendingPosition) {
    return (
      <ScreenState>
        <Ionicons name="alert-circle-outline" size={42} color={colors.primary} />
        <Text style={styles.stateTitle}>Dinlenme ekranı açılamadı</Text>
        <Text style={styles.stateText}>{loadError ?? "Dinlenme verisi eksik."}</Text>
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

  const elapsed = formatElapsedDuration(getElapsedDurationMs(session, now));
  const durationSeconds = Math.max(
    remainingSeconds,
    session.restDurationSeconds ?? remainingSeconds,
  );
  const addDisabled =
    isTransitioning || isExtending || remainingSeconds >= MAX_REST_SECONDS;

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
        <RestHeaderCard completedSetNumber={completedPosition.set.setNumber} />
        <RestProgressRing
          durationSeconds={durationSeconds}
          remainingSeconds={remainingSeconds}
        />
        <NextWorkoutCard target={pendingPosition} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {actionError ? (
          <Text accessibilityLiveRegion="polite" style={styles.actionError}>
            {actionError}
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Dinlenme süresine 15 saniye ekle"
            accessibilityRole="button"
            accessibilityState={{ busy: isExtending, disabled: addDisabled }}
            disabled={addDisabled}
            onPress={() => void extendRest()}
            style={({ pressed }) => [
              styles.addButton,
              addDisabled && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {isExtending ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.addButtonText}>+15sn</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Dinlenmeyi atla ve sıradaki sete geç"
            accessibilityRole="button"
            accessibilityState={{ busy: isTransitioning, disabled: isTransitioning }}
            disabled={isTransitioning}
            onPress={() => void advanceToNextSet()}
            style={({ pressed }) => [
              styles.skipButton,
              isTransitioning && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            {isTransitioning ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.skipButtonText}>Dinlenmeyi atla</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ScreenState({ children }: { children: React.ReactNode }) {
  const styles = useThemedScreenStyles(baseStyles);
  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.centerState}>{children}</View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 17,
    paddingBottom: 20,
    gap: 14,
  },
  footer: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 17,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MainColors.subtleBorder,
    backgroundColor: MainColors.background,
  },
  actionRow: { flexDirection: "row", gap: 10 },
  addButton: {
    width: 76,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 17,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: MainColors.text, fontSize: 14, fontWeight: "700" },
  skipButton: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: { color: MainColors.text, fontSize: 15, fontWeight: "900" },
  actionError: {
    marginBottom: 8,
    color: "#B73535",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  disabledButton: { opacity: 0.48 },
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

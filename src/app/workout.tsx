import {
  ExerciseDotPagination,
  ExerciseInfoCard,
  ExerciseMedia,
  SetSelector,
  TargetRepetitionCard,
  WorkoutTopBar,
} from "@/features/workouts/components/active-workout-components";
import {
  findFirstIncompleteSetIndexInExercise,
  findMostRecentlyCompletedPosition,
  formatElapsedDuration,
  getElapsedDurationMs,
  getWorkoutProgress,
  resolveDefaultExerciseIndex,
} from "@/features/workouts/workout-domain";
import { getWorkoutMascotMessage } from "@/shared/lib/mascot-messages";
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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const CONTENT_HORIZONTAL_PADDING = 17;
const CONTENT_MAX_WIDTH = 680;

type SaveStatus = "idle" | "saving" | "saved" | "error";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const pageWidth =
    Math.min(windowWidth, CONTENT_MAX_WIDTH) - CONTENT_HORIZONTAL_PADDING * 2;
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
  // Kullanıcının o an kaydırarak baktığı hareket — sette olduğu gibi hareket
  // sırası artık zorunlu değil, kullanıcı istediği harekete geçip
  // (ör. alet doluysa) sonra geri dönebilir. bkz. resolveDefaultExerciseIndex.
  const [viewedExerciseIndex, setViewedExerciseIndex] = useState<
    number | null
  >(null);
  const mountedRef = useRef(true);
  const sessionRef = useRef<WorkoutSession | null>(null);
  const transitionInProgressRef = useRef(false);
  const completionNavigationRef = useRef(false);
  const pagerRef = useRef<FlatList<WorkoutSession["exercises"][number]>>(null);

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
    setViewedExerciseIndex(null);
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
        resolveDefaultExerciseIndex(nextSession) === null
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

  // Hangi hareketin gösterileceğine yalnızca session yeniden yüklendiğinde
  // (ekran ilk açıldığında veya dinlenmeden dönüldüğünde) karar verilir;
  // kullanıcı zaten bir harekete bakıyorsa (viewedExerciseIndex dolu) bu
  // seçim korunur — bir set tamamlandığında otomatik olarak başka bir
  // harekete atlanmaz.
  useEffect(() => {
    if (!session || viewedExerciseIndex !== null) return;
    setViewedExerciseIndex(resolveDefaultExerciseIndex(session) ?? 0);
  }, [session, viewedExerciseIndex]);

  const selectExercise = useCallback((index: number) => {
    setViewedExerciseIndex(index);
    pagerRef.current?.scrollToIndex({ animated: true, index });
  }, []);

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
    // Geri dönülecek hareket her zaman şu an bakılan hareket olmayabilir
    // (kullanıcı başka bir harekete kaydırmış olabilir) — geri alınan setin
    // gerçekte hangi harekete ait olduğunu geri dönmeden önce yakalayıp
    // görünümü ona göre kaydırıyoruz.
    const revertedPosition = findMostRecentlyCompletedPosition(current);

    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    try {
      const updated = await workoutRepository.revertLastCompletedSet(workoutSessionId);
      sessionRef.current = updated;
      if (mountedRef.current) {
        setSession(updated);
        if (revertedPosition) setViewedExerciseIndex(revertedPosition.exerciseIndex);
      }
    } catch {
      setActionError("Önceki sete dönülemedi. Lütfen yeniden dene.");
    } finally {
      transitionInProgressRef.current = false;
      if (mountedRef.current) setIsTransitioning(false);
    }
  }, [requestExit, workoutSessionId]);

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
    if (!current || current.phase !== "active" || viewedExerciseIndex === null) {
      return;
    }
    const exercise = current.exercises[viewedExerciseIndex];
    const setIndex = exercise
      ? findFirstIncompleteSetIndexInExercise(exercise)
      : -1;
    if (!exercise || setIndex < 0) return;
    const targetSet = exercise.sets[setIndex];

    transitionInProgressRef.current = true;
    setIsTransitioning(true);
    setActionError(null);
    let finalizing = false;
    try {
      const updated = await workoutRepository.completeSet({
        workoutSessionId,
        setId: targetSet.id,
        actualReps: targetSet.targetReps,
        weightKg: targetSet.weightKg,
      });
      sessionRef.current = updated;
      if (mountedRef.current) setSession(updated);

      if (updated.phase === "rest") {
        replaceWithRest();
        return;
      }

      if (!getWorkoutProgress(updated.exercises).canFinalize) {
        // Bu hareket bitti ama antrenmanda başka tamamlanmamış hareket var —
        // ekranda kal, kullanıcı kaydırarak devam edeceği harekete geçsin.
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
  }, [replaceWithCompletion, replaceWithRest, viewedExerciseIndex, workoutSessionId]);

  if (session === undefined && !loadError) {
    return (
      <ScreenState>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.stateText}>Antrenman hazırlanıyor…</Text>
      </ScreenState>
    );
  }

  if (!session || loadError) {
    return (
      <ScreenState>
        <Ionicons name="alert-circle-outline" size={42} color={colors.primary} />
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

  if (session.phase === "saving" || viewedExerciseIndex === null) {
    return (
      <ScreenState>
        {saveStatus === "saving" ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={44} color={colors.primary} />
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

  const elapsed = formatElapsedDuration(getElapsedDurationMs(session, now));
  const viewedExercise = session.exercises[viewedExerciseIndex];
  const viewedSetIndex = viewedExercise
    ? findFirstIncompleteSetIndexInExercise(viewedExercise)
    : -1;
  const viewedExerciseDone = Boolean(viewedExercise) && viewedSetIndex < 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <WorkoutExitDialog
        onCancel={cancelExit}
        onConfirm={confirmExit}
        visible={exitDialogVisible}
      />
      <View style={styles.topBarRow}>
        <WorkoutTopBar
          elapsed={elapsed}
          onBack={() => void goBackOneStep()}
          onExit={requestExit}
        />
      </View>

      <FlatList
        data={session.exercises}
        getItemLayout={(_, index) => ({
          index,
          length: pageWidth,
          offset: pageWidth * index,
        })}
        horizontal
        initialScrollIndex={viewedExerciseIndex}
        keyExtractor={(item) => item.programExerciseId}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / pageWidth,
          );
          setViewedExerciseIndex(nextIndex);
        }}
        pagingEnabled
        ref={pagerRef}
        renderItem={({ item, index }) => {
          const setIndex = findFirstIncompleteSetIndexInExercise(item);
          const targetSet = setIndex >= 0 ? item.sets[setIndex] : null;
          return (
            <ScrollView
              contentContainerStyle={[styles.pageContent, { width: pageWidth }]}
              showsVerticalScrollIndicator={false}
              style={{ width: pageWidth }}
            >
              <ExerciseInfoCard
                exercise={item}
                exerciseIndex={index}
                mascotMessage={getWorkoutMascotMessage({
                  exerciseIndex: index,
                  exerciseCount: session.exercises.length,
                  setIndex,
                  setCount: item.sets.length,
                })}
                totalExercises={session.exercises.length}
              />
              <ExerciseMedia exerciseName={item.name} mediaUrl={item.mediaUrl} />
              <SetSelector activeSetId={targetSet?.id ?? null} sets={item.sets} />
              {targetSet ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>HEDEF TEKRAR</Text>
                  <TargetRepetitionCard value={targetSet.targetReps} />
                </View>
              ) : (
                <View style={styles.doneCard}>
                  <Ionicons
                    name="checkmark-circle"
                    size={26}
                    color={colors.primary}
                  />
                  <Text style={styles.doneText}>Bu hareket tamamlandı</Text>
                </View>
              )}
            </ScrollView>
          );
        }}
        showsHorizontalScrollIndicator={false}
        style={{ width: pageWidth, alignSelf: "center" }}
      />

      <View style={styles.dotRow}>
        <ExerciseDotPagination
          activeIndex={viewedExerciseIndex}
          count={session.exercises.length}
          onSelect={selectExercise}
        />
      </View>

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
            disabled: isTransitioning || viewedExerciseDone,
          }}
          disabled={isTransitioning || viewedExerciseDone}
          onPress={() => void completeCurrentSet()}
          style={({ pressed }) => [
            styles.completeButton,
            (isTransitioning || viewedExerciseDone) && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          {isTransitioning ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.completeButtonText}>
              {viewedExerciseDone ? "Hareket tamamlandı ✓" : "Seti tamamla ✓"}
            </Text>
          )}
        </Pressable>
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
  topBarRow: {
    width: "100%",
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: "center",
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingTop: 8,
  },
  pageContent: {
    paddingBottom: 24,
    gap: 12,
  },
  dotRow: {
    paddingVertical: 12,
  },
  doneCard: {
    marginTop: 2,
    paddingVertical: 28,
    borderWidth: 1.5,
    borderColor: MainColors.subtleBorder,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  doneText: {
    color: MainColors.mutedText,
    fontSize: 15,
    fontWeight: "800",
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

import {
  ProgramExerciseRow,
  ProgramPills,
  ProgramSummaryCard,
  WeekDaySelector,
} from "@/features/programs/components/program-dashboard-components";
import {
  getCompletedExerciseIds,
  getCurrentWeek,
  getProgramCompletion,
  programsForDate,
  resolveActiveProgramId,
  toLocalDateKey,
  type ProgramCompletionRecord,
} from "@/features/programs/program-dashboard";
import { programRepository } from "@/features/programs/program-repository";
import {
  getCurrentUserDisplayName,
  getProgramCompletionRecords,
} from "@/features/programs/program-screen-service";
import type { UserProgram } from "@/features/programs/types";
import {
  workoutRepository,
  WorkoutRepositoryError,
} from "@/features/workouts/workout-repository";
import { DataErrorState } from "@/shared/components/data-error-state";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoadState = "loading" | "success" | "error";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export default function ProgramScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isOffline } = useConnectivity();
  const params = useLocalSearchParams<{
    selectedDate?: string | string[];
    activeProgramId?: string | string[];
  }>();
  const week = useMemo(() => getCurrentWeek(), []);
  const requestedDate = singleParam(params.selectedDate);
  const initialDate = week.some((day) => day.dateKey === requestedDate)
    ? requestedDate!
    : toLocalDateKey(new Date());

  const [selectedDateKey, setSelectedDateKey] = useState(initialDate);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(
    singleParam(params.activeProgramId) ?? null,
  );
  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [programState, setProgramState] = useState<LoadState>("loading");
  const [completionRecords, setCompletionRecords] = useState<
    ProgramCompletionRecord[] | null
  >(null);
  const [chartState, setChartState] = useState<LoadState>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [isTodayCompleted, setIsTodayCompleted] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const navigationLock = useRef(false);
  const hasSuccessfulProgramsRef = useRef(false);
  const hasSuccessfulChartRef = useRef(false);
  const lastAppliedDateParam = useRef(requestedDate);
  const requestedProgramId = singleParam(params.activeProgramId) ?? null;
  const lastAppliedProgramParam = useRef(requestedProgramId);

  useEffect(() => {
    if (
      requestedDate !== lastAppliedDateParam.current &&
      week.some((day) => day.dateKey === requestedDate)
    ) {
      setSelectedDateKey(requestedDate!);
    }
    lastAppliedDateParam.current = requestedDate;

    if (requestedProgramId !== lastAppliedProgramParam.current) {
      setActiveProgramId(requestedProgramId);
    }
    lastAppliedProgramParam.current = requestedProgramId;
  }, [requestedDate, requestedProgramId, week]);

  const loadPrograms = useCallback(async () => {
    setProgramState("loading");
    try {
      setPrograms(await programRepository.listPrograms());
      hasSuccessfulProgramsRef.current = true;
      setProgramState("success");
    } catch {
      setProgramState("error");
    }
  }, []);

  const loadChart = useCallback(async () => {
    setChartState("loading");
    try {
      setCompletionRecords(
        await getProgramCompletionRecords(
          week[0].dateKey,
          week[week.length - 1].dateKey,
        ),
      );
      hasSuccessfulChartRef.current = true;
      setChartState("success");
    } catch {
      setChartState("error");
    }
  }, [week]);

  useEffect(() => {
    let mounted = true;
    void getCurrentUserDisplayName()
      .then((name) => {
        if (mounted) setDisplayName(name);
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigationLock.current = false;
      setNavigationBusy(false);
      void loadPrograms();
      void loadChart();
    }, [loadChart, loadPrograms]),
  );

  const dailyPrograms = useMemo(
    () => programsForDate(programs, week, selectedDateKey),
    [programs, selectedDateKey, week],
  );

  useEffect(() => {
    if (programState !== "success") return;
    setActiveProgramId((current) =>
      resolveActiveProgramId(dailyPrograms, current),
    );
  }, [dailyPrograms, programState]);

  const activeProgram =
    dailyPrograms.find((program) => program.id === activeProgramId) ?? null;

  useEffect(() => {
    if (!activeProgram) {
      setIsTodayCompleted(false);
      return;
    }
    let mounted = true;
    void workoutRepository
      .getCompletionForProgramDate(activeProgram.id, selectedDateKey)
      .then((completion) => {
        if (mounted) setIsTodayCompleted(Boolean(completion));
      })
      .catch(() => {
        if (mounted) setIsTodayCompleted(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeProgram, selectedDateKey]);

  const handleResetToday = useCallback(() => {
    if (!activeProgram) return;
    const program = activeProgram;
    const performReset = () => {
      void workoutRepository
        .resetCompletedSession(program.id, selectedDateKey)
        .then(() => {
          setIsTodayCompleted(false);
          void loadChart();
        })
        .catch(() => {
          const message = "Antrenman kaydı sıfırlanamadı. Lütfen tekrar deneyin.";
          if (Platform.OS === "web") {
            window.alert(message);
          } else {
            Alert.alert("Sıfırlanamadı", message);
          }
        });
    };

    const confirmMessage =
      "Bugün için tamamlanan bu antrenman kaydı silinecek ve baştan başlatabileceksin. Emin misin?";

    // react-native-web'de Alert.alert no-op — butonlu bir dialog hiç
    // görünmüyor, onPress asla tetiklenmiyor. Web'de window.confirm'e
    // düşülüyor, native'de normal Alert.alert kullanılıyor.
    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) performReset();
      return;
    }

    Alert.alert("Antrenmanı sıfırla", confirmMessage, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sıfırla", style: "destructive", onPress: performReset },
    ]);
  }, [activeProgram, loadChart, selectedDateKey]);

  const currentCompletionRecords = useMemo(
    () => completionRecords ?? [],
    [completionRecords],
  );
  const completedExerciseIds = useMemo(
    () =>
      activeProgram
        ? getCompletedExerciseIds(
            currentCompletionRecords,
            selectedDateKey,
            activeProgram.id,
          )
        : new Set<string>(),
    [activeProgram, currentCompletionRecords, selectedDateKey],
  );
  const errorVariant = isOffline ? "offline" : "service";
  const hasProgramLoadError = programState === "error";
  const hasChartLoadError = chartState === "error";
  const hasLoadError = hasProgramLoadError || hasChartLoadError;
  const canContinueOffline =
    (!hasProgramLoadError || hasSuccessfulProgramsRef.current) &&
    (!hasChartLoadError || hasSuccessfulChartRef.current);

  const retryFailedLoads = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      const retries: Promise<void>[] = [];
      if (hasProgramLoadError) retries.push(loadPrograms());
      if (hasChartLoadError) retries.push(loadChart());
      await Promise.all(retries);
    } finally {
      setIsRetrying(false);
    }
  }, [
    hasChartLoadError,
    hasProgramLoadError,
    isRetrying,
    loadChart,
    loadPrograms,
  ]);

  const continueOffline = useCallback(() => {
    if (!canContinueOffline) return;
    if (hasProgramLoadError) setProgramState("success");
    if (hasChartLoadError) setChartState("success");
  }, [canContinueOffline, hasChartLoadError, hasProgramLoadError]);

  const handleEdit = useCallback(
    (programId: string) => {
      router.push({
        pathname: "/program-edit" as never,
        params: { programId, selectedDate: selectedDateKey },
      });
    },
    [selectedDateKey],
  );

  const handleStartWorkout = useCallback(async () => {
    if (!activeProgram || navigationLock.current) return;
    if (activeProgram.exercises.length === 0) {
      Alert.alert(
        "Antrenman başlatılamadı",
        "Bu programda henüz egzersiz bulunmuyor.",
      );
      return;
    }
    navigationLock.current = true;
    setNavigationBusy(true);
    try {
      const session = await workoutRepository.startOrResumeSession(
        activeProgram.id,
        selectedDateKey,
      );
      router.push({
        pathname: "/workout" as never,
        params: { workoutSessionId: session.id },
      });
    } catch (error) {
      navigationLock.current = false;
      setNavigationBusy(false);
      Alert.alert(
        "Antrenman başlatılamadı",
        error instanceof WorkoutRepositoryError
          ? error.message
          : "Bağlantınızı kontrol edip tekrar deneyin.",
      );
    }
  }, [activeProgram, selectedDateKey]);

  const handleAddWorkout = useCallback(() => {
    const selectedTrainingDay = week.find(
      (day) => day.dateKey === selectedDateKey,
    )?.day;
    router.push({
      pathname: "/exercise" as never,
      params: {
        selectionMode: "new-program",
        selectedDate: selectedDateKey,
        ...(selectedTrainingDay
          ? { initialTrainingDay: selectedTrainingDay }
          : {}),
      },
    });
  }, [selectedDateKey, week]);

  if (hasLoadError || isRetrying) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DataErrorState
          errorCode="FIT-SERVICE-PROGRAM"
          onRetry={() => void retryFailedLoads()}
          onSecondaryAction={
            errorVariant === "offline"
              ? canContinueOffline
                ? continueOffline
                : undefined
              : () => router.replace("/(main)")
          }
          secondaryActionDisabled={
            isRetrying || (errorVariant === "offline" && !canContinueOffline)
          }
          retrying={isRetrying}
          variant={errorVariant}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.greeting}>
            Merhaba,
            <Text style={styles.greetingName}>
              {profileLoading ? " …" : ` ${displayName ?? "Sporcu"}`}
            </Text>
          </Text>
        <Pressable
  accessibilityLabel="Profil"
  accessibilityRole="button"
  onPress={() => router.push("/(main)/profile")}
  style={({ pressed }) => [
    styles.notificationButton,
    pressed && styles.pressed,
  ]}
>
  <Ionicons
    name="person-outline"
    size={22}
    color={colors.text}
  />
</Pressable>
        </View>

        <View style={styles.fullBleed}>
          <WeekDaySelector
            onSelect={setSelectedDateKey}
            selectedDateKey={selectedDateKey}
            week={week}
          />
        </View>

        {programState === "loading" && !hasSuccessfulProgramsRef.current ? (
          <SectionState loading text="Programlar yükleniyor…" />
        ) : dailyPrograms.length > 0 ? (
          <View style={styles.programCards}>
            {dailyPrograms.map((program) => (
              <ProgramSummaryCard
                completion={getProgramCompletion(
                  program,
                  currentCompletionRecords,
                  selectedDateKey,
                )}
                key={program.id}
                onEdit={handleEdit}
                program={program}
              />
            ))}
          </View>
        ) : programs.length === 0 ? (
          <View style={styles.emptyProgramsCard}>
            <View style={styles.emptyProgramsIcon}>
              <Ionicons name="barbell-outline" size={27} color={colors.primary} />
            </View>
            <Text style={styles.emptyProgramsTitle}>Henüz bir programın yok</Text>
            <Text style={styles.stateText}>
              Hazır olduğunda kendine uygun yeni bir program oluşturabilirsin.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleAddWorkout}
              style={({ pressed }) => [styles.createProgramButton, pressed && styles.pressed]}
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.createProgramText}>Yeni program oluştur</Text>
            </Pressable>
          </View>
        ) : (
          <EmptyCard text="Bu gün için planlanmış bir program bulunmuyor." />
        )}

        <Text style={styles.sectionTitle}>BUGÜNKÜ PROGRAMLAR</Text>
        {dailyPrograms.length > 0 ? (
          <ProgramPills
            activeProgramId={activeProgramId}
            onSelect={setActiveProgramId}
            programs={dailyPrograms}
          />
        ) : (
          <Text style={styles.inlineEmpty}>Seçilebilecek bir program yok.</Text>
        )}

        <View style={styles.exerciseList}>
          {activeProgram && completionRecords !== null ? (
            activeProgram.exercises.length > 0 ? (
              activeProgram.exercises.map((exercise) => (
                <ProgramExerciseRow
                  completed={completedExerciseIds.has(exercise.id)}
                  exercise={exercise}
                  key={exercise.id}
                />
              ))
            ) : (
              <EmptyCard text="Bu programda henüz egzersiz bulunmuyor." />
            )
          ) : null}
        </View>

        {activeProgram && isTodayCompleted ? (
          <Pressable
            accessibilityRole="button"
            onPress={handleResetToday}
            style={({ pressed }) => [styles.resetLink, pressed && styles.pressed]}
          >
            <Text style={styles.resetLinkText}>Bugünkü antrenmanı sıfırla</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {programs.length > 0 ? <View style={styles.fixedFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: programState === "loading" }}
          disabled={programState === "loading"}
          onPress={handleAddWorkout}
          style={({ pressed }) => [
            styles.addWorkoutButton,
            programState === "loading" && styles.startButtonDisabled,
            pressed && programState !== "loading" && styles.pressed,
          ]}
        >
          <Text style={styles.addWorkoutButtonText}>+ Program ekle</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              !activeProgram || navigationBusy || programState === "loading",
          }}
          disabled={!activeProgram || navigationBusy || programState === "loading"}
          onPress={() => void handleStartWorkout()}
          style={({ pressed }) => [
            styles.startButton,
            (!activeProgram || navigationBusy || programState === "loading") &&
              styles.startButtonDisabled,
            pressed && programState !== "loading" && styles.pressed,
          ]}
        >
          {navigationBusy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons
                name="play"
                size={18}
                color={colors.onPrimary}
              />
              <Text style={styles.startButtonText}>
                Antrenmana başla
              </Text>
            </>
          )}
        </Pressable>
      </View> : null}
    </SafeAreaView>
  );
}

function SectionState({
  loading = false,
  text,
  onRetry,
}: {
  loading?: boolean;
  text: string;
  onRetry?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.stateCard}>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="alert-circle-outline" size={24} color={colors.textSecondary} />
      )}
      <Text style={styles.stateText}>{text}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Yeniden dene</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 18,
  },
  topRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  greeting: { flex: 1, color: colors.textSecondary, fontSize: 16, fontWeight: "500" },
  greetingName: { color: colors.primary, fontWeight: "800" },
  notificationButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fullBleed: { marginHorizontal: -18 },
  programCards: { gap: 12 },
  sectionTitle: { marginTop: 2, color: colors.textSecondary, fontSize: 15, fontWeight: "700" },
  inlineEmpty: { color: colors.textSecondary, fontSize: 14 },
  exerciseList: { gap: 10 },
  resetLink: { alignSelf: "center", padding: 8 },
  resetLinkText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  stateCard: {
    minHeight: 118,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  emptyCard: {
    minHeight: 84,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyProgramsCard: {
    minHeight: 230,
    padding: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyProgramsIcon: {
    width: 56,
    height: 56,
    marginBottom: 12,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyProgramsTitle: {
    marginBottom: 7,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  createProgramButton: {
    minHeight: 50,
    marginTop: 18,
    paddingHorizontal: 20,
    borderRadius: 17,
    backgroundColor: colors.primaryBright,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createProgramText: { color: colors.onPrimary, fontSize: 15, fontWeight: "900" },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 40, paddingHorizontal: 18, justifyContent: "center" },
  retryText: { color: colors.primary, fontSize: 14, fontWeight: "800" },
  fixedFooter: {
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 10,
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    gap: 8,
  },
  addWorkoutButton: {
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addWorkoutButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  startButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: colors.primaryBright,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  startButtonDisabled: { backgroundColor: colors.disabled, opacity: 0.72 },
  startButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

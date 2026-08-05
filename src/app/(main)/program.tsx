import {
  ProgramExerciseRow,
  ProgramPills,
  ProgramSummaryCard,
  WeekDaySelector,
  WeeklyTrainingChart,
} from "@/features/programs/components/program-dashboard-components";
import {
  getCompletedExerciseIds,
  getCurrentWeek,
  getProgramCompletion,
  getWeeklyCompletionValues,
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
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type LoadState = "loading" | "success" | "error";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export default function ProgramScreen() {
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
    ProgramCompletionRecord[]
  >([]);
  const [chartState, setChartState] = useState<LoadState>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const navigationLock = useRef(false);
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
      setChartState("success");
    } catch {
      setCompletionRecords([]);
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
  const completedExerciseIds = useMemo(
    () => getCompletedExerciseIds(completionRecords, selectedDateKey),
    [completionRecords, selectedDateKey],
  );
  const chartValues = useMemo(
    () => getWeeklyCompletionValues(week, completionRecords),
    [completionRecords, week],
  );

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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.greeting}>
            Merhaba,
            <Text style={styles.greetingName}>
              {profileLoading ? " …" : ` ${displayName ?? "Sporcu"}`}
            </Text>
          </Text>
          <Pressable
            accessibilityLabel="Bildirimler"
            accessibilityRole="button"
            onPress={() => Alert.alert("Bildirimler", "Henüz yeni bir bildiriminiz yok.")}
            style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={22} color={MainColors.text} />
          </Pressable>
        </View>

        <View style={styles.fullBleed}>
          <WeekDaySelector
            onSelect={setSelectedDateKey}
            selectedDateKey={selectedDateKey}
            week={week}
          />
        </View>

        {programState === "loading" ? (
          <SectionState loading text="Programlar yükleniyor…" />
        ) : programState === "error" ? (
          <SectionState
            onRetry={() => void loadPrograms()}
            text="Programlar alınamadı. Lütfen tekrar deneyin."
          />
        ) : dailyPrograms.length > 0 ? (
          <View style={styles.programCards}>
            {dailyPrograms.map((program) => (
              <ProgramSummaryCard
                completion={getProgramCompletion(
                  program,
                  completionRecords,
                  selectedDateKey,
                )}
                key={program.id}
                onEdit={handleEdit}
                program={program}
              />
            ))}
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

        {chartState === "loading" ? (
          <SectionState loading text="Haftalık grafik yükleniyor…" />
        ) : chartState === "error" ? (
          <SectionState
            onRetry={() => void loadChart()}
            text="Haftalık grafik alınamadı."
          />
        ) : (
          <WeeklyTrainingChart values={chartValues} />
        )}

        <View style={styles.exerciseList}>
          {activeProgram ? (
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
      </ScrollView>

      <View style={styles.fixedFooter}>
        <Ionicons name="barbell-outline" size={20} color={MainColors.mutedText} />
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
            pressed && activeProgram && styles.pressed,
          ]}
        >
          {navigationBusy ? (
            <ActivityIndicator color={MainColors.text} />
          ) : (
            <>
              <Ionicons name="play" size={18} color={MainColors.text} />
              <Text style={styles.startButtonText}>Antrenmana başla</Text>
            </>
          )}
        </Pressable>
      </View>
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
  return (
    <View style={styles.stateCard}>
      {loading ? (
        <ActivityIndicator color={MainColors.primary} />
      ) : (
        <Ionicons name="alert-circle-outline" size={24} color={MainColors.mutedText} />
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
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 108,
    gap: 18,
  },
  topRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  greeting: { flex: 1, color: MainColors.mutedText, fontSize: 16, fontWeight: "500" },
  greetingName: { color: MainColors.primary, fontWeight: "800" },
  notificationButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 21,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fullBleed: { marginHorizontal: -18 },
  programCards: { gap: 12 },
  sectionTitle: { marginTop: 2, color: MainColors.mutedText, fontSize: 15, fontWeight: "700" },
  inlineEmpty: { color: MainColors.mutedText, fontSize: 14 },
  exerciseList: { gap: 10 },
  stateCard: {
    minHeight: 118,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  emptyCard: {
    minHeight: 84,
    padding: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: { color: MainColors.mutedText, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 40, paddingHorizontal: 18, justifyContent: "center" },
  retryText: { color: MainColors.primary, fontSize: 14, fontWeight: "800" },
  fixedFooter: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 10,
    height: 66,
    padding: 8,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startButton: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  startButtonDisabled: { backgroundColor: MainColors.border, opacity: 0.72 },
  startButtonText: { color: MainColors.text, fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

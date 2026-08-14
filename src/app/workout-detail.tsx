import { RoundBackButton } from "@/features/progress/components/progress-components";
import {
  formatWeightKg,
  formatLocalWorkoutDate,
  formatLocalWorkoutTime,
} from "@/features/progress/progress-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import {
  formatCompletionDuration,
} from "@/features/workouts/workout-domain";
import type {
  WorkoutCompletion,
  WorkoutExerciseSnapshot,
} from "@/features/workouts/types";
import { DataErrorState } from "@/shared/components/data-error-state";
import { MascotSpeechBubble } from "@/shared/components/mascot-speech-bubble";
import { WORKOUT_DETAIL_MASCOTS } from "@/shared/constants/mascot-assets";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const WORKOUT_DETAIL_MESSAGES = [
  "Harika bir antrenmandı! 💪",
  "Bugün de tamam! ✨",
  "Emeğinin karşılığı geliyor! 🌱",
] as const;

function getStableWorkoutDetailIndex(workoutSessionId: string) {
  let hash = 0;
  for (let index = 0; index < workoutSessionId.length; index += 1) {
    hash = (hash * 31 + workoutSessionId.charCodeAt(index)) >>> 0;
  }
  return hash % WORKOUT_DETAIL_MESSAGES.length;
}

function getWorkoutDetailResult(workoutSessionId: string) {
  const index = getStableWorkoutDetailIndex(workoutSessionId);
  return {
    message: WORKOUT_DETAIL_MESSAGES[index],
    mascot:
      index === 0
        ? WORKOUT_DETAIL_MASCOTS.shakerThumbsUp
        : WORKOUT_DETAIL_MASCOTS.standing,
  };
}

export default function WorkoutDetailScreen() {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 430;
  const styles = useMemo(
    () => createStyles(colors, isCompactWidth),
    [colors, isCompactWidth],
  );
  const params = useLocalSearchParams<{ workoutSessionId?: string | string[] }>();
  const workoutSessionId = singleParam(params.workoutSessionId)?.trim() ?? "";
  const [completion, setCompletion] = useState<WorkoutCompletion | null>();
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isValidWorkoutSessionId(workoutSessionId)) {
      setCompletion(null);
      setLoadError(null);
      return;
    }
    setCompletion(undefined);
    setLoadError(null);
    try {
      setCompletion(await workoutRepository.getCompletion(workoutSessionId));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Antrenman detayı yüklenemedi.",
      );
    }
  }, [workoutSessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const completedSetCount = useMemo(
    () =>
      completion?.exercises.reduce(
        (total, exercise) =>
          total + exercise.sets.filter((set) => Boolean(set.completedAt)).length,
        0,
      ) ?? 0,
    [completion],
  );
  const mascotResult = completion
    ? getWorkoutDetailResult(workoutSessionId)
    : null;

  if (completion === undefined && !loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Antrenman detayı hazırlanıyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DataErrorState
          description={loadError}
          onRetry={() => void load()}
          presentation="fullscreen"
          variant="service"
        />
      </SafeAreaView>
    );
  }

  if (!completion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Ionicons name="document-outline" size={44} color={colors.primary} />
          <Text style={styles.stateTitle}>Antrenman detayı bulunamadı</Text>
          <Text style={styles.stateText}>
            Geçerli ve tamamlanmış bir antrenman kaydı seçilmedi.
          </Text>
          <Pressable
            onPress={() => router.replace("/(main)/progress" as never)}
            style={styles.backToProgress}
          >
            <Text style={styles.backToProgressText}>İlerlemene dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <RoundBackButton onPress={() => router.back()} />
          <Text style={styles.topTitle}>Antrenman detayı</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryDate}>
            {formatLocalWorkoutDate(completion.completedAt)} · {formatLocalWorkoutTime(completion.completedAt)}
          </Text>
          <Text style={styles.summaryName}>{completion.programName}</Text>
          <View style={styles.summaryStats}>
            <SummaryMetric
              label="SÜRE"
              value={formatCompletionDuration(completion.durationMs)}
            />
            <SummaryMetric
              label="HAREKET"
              value={String(completion.completedExerciseCount)}
            />
            <SummaryMetric label="TOPLAM SET" value={String(completedSetCount)} />
          </View>
          <View pointerEvents="none" style={styles.summaryMascotArea}>
            <MascotSpeechBubble
              compact
              message={mascotResult?.message ?? ""}
              tailDirection="bottom-right"
              style={styles.summarySpeechBubble}
            />
            <Image
              accessibilityLabel="Antrenman sonucu FitRehber tavşan maskotu"
              contentFit="contain"
              source={mascotResult?.mascot}
              style={styles.summaryMascot}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>HAREKETLER</Text>
        {completion.exercises.length > 0 ? (
          completion.exercises.map((exercise) => (
            <ExerciseDetailCard exercise={exercise} key={exercise.programExerciseId} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.stateTitle}>Hareket kaydı bulunmuyor</Text>
            <Text style={styles.stateText}>Bu tamamlanmada egzersiz snapshot’ı yok.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.summaryMetric}>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryMetricValue}>{value}</Text>
      <Text style={styles.summaryMetricLabel}>{label}</Text>
    </View>
  );
}

function ExerciseDetailCard({ exercise }: { exercise: WorkoutExerciseSnapshot }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseCopy}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMuscle}>{exercise.muscleGroupName ?? "Kas grubu bilinmiyor"}</Text>
        </View>
        <View style={styles.exerciseIcon}>
          <Ionicons name="barbell-outline" size={21} color={colors.textSecondary} />
        </View>
      </View>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.setColumn]}>SET</Text>
        <Text style={[styles.tableHeaderText, styles.dataColumn]}>KG</Text>
        <Text style={[styles.tableHeaderText, styles.dataColumn]}>TEKRAR</Text>
        <View style={styles.statusColumn} />
      </View>
      {exercise.sets.map((set) => {
        const completed = Boolean(set.completedAt);
        return (
          <View key={set.id} style={styles.setRow}>
            <Text style={[styles.setNumber, styles.setColumn]}>{set.setNumber}</Text>
            <View style={[styles.setValueBox, styles.dataColumn]}>
              <Text style={styles.setValue}>{formatWeightKg(set.weightKg)}</Text>
            </View>
            <View style={[styles.setValueBox, styles.dataColumn]}>
              <Text style={styles.setValue}>{set.actualReps}</Text>
            </View>
            <View
              accessibilityLabel={completed ? "Set tamamlandı" : "Set tamamlanmadı"}
              style={[styles.setStatus, !completed && styles.setStatusPending]}
            >
              <Ionicons
                name={completed ? "checkmark" : "remove"}
                size={17}
                color={completed ? colors.onPrimary : colors.textSecondary}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: AppThemeColors, isCompactWidth = false) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22, paddingTop: 8, paddingBottom: 30, gap: 18 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.textSecondary, fontSize: 17, fontWeight: "700" },
  headerSpacer: { width: 42 },
  summaryCard: { marginTop: 10, padding: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 25, backgroundColor: colors.surfaceElevated, overflow: "hidden" },
  summaryDate: { maxWidth: isCompactWidth ? "45%" : "52%", color: colors.textSecondary, fontSize: 12, fontWeight: "900" },
  summaryName: { maxWidth: isCompactWidth ? "48%" : "55%", marginTop: 9, color: colors.text, fontSize: 27, fontWeight: "900" },
  summaryStats: { marginTop: 22, flexDirection: "row", gap: 16 },
  summaryMetric: { flex: 1, minWidth: 0 },
  summaryMetricValue: { color: colors.text, fontSize: 19, fontWeight: "900" },
  summaryMetricLabel: { marginTop: 4, color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  summaryMascotArea: isCompactWidth
    ? { position: "absolute", top: 8, right: 8, width: 211, height: 112 }
    : { position: "absolute", top: 8, right: 10, width: 276, height: 136 },
  summarySpeechBubble: isCompactWidth
    ? { position: "absolute", top: 0, left: 0, width: 126, maxWidth: 126, zIndex: 2 }
    : { position: "absolute", top: 2, left: 0, width: 158, maxWidth: 158, zIndex: 2 },
  summaryMascot: isCompactWidth
    ? { position: "absolute", right: 0, bottom: 0, width: 101, height: 101 }
    : { position: "absolute", right: 0, bottom: 0, width: 128, height: 128 },
  sectionTitle: { marginTop: 2, color: colors.textSecondary, fontSize: 15, fontWeight: "900", letterSpacing: 0.4 },
  exerciseCard: { padding: 18, borderWidth: 1.5, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface },
  exerciseHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  exerciseCopy: { flex: 1 },
  exerciseName: { color: colors.text, fontSize: 20, fontWeight: "900" },
  exerciseMuscle: { marginTop: 3, color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  exerciseIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  tableHeader: { marginTop: 16, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, flexDirection: "row", alignItems: "center", gap: 8 },
  tableHeaderText: { color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  setColumn: { width: 42 },
  dataColumn: { flex: 1, minWidth: 0 },
  statusColumn: { width: 38 },
  setRow: { minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle, flexDirection: "row", alignItems: "center", gap: 8 },
  setNumber: { color: colors.text, fontSize: 16, fontWeight: "900" },
  setValueBox: { minHeight: 36, borderRadius: 12, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  setValue: { color: colors.text, fontSize: 15, fontWeight: "900" },
  setStatus: { width: 38, height: 30, borderRadius: 15, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  setStatusPending: { backgroundColor: colors.surfaceElevated },
  emptyCard: { padding: 28, borderWidth: 1.5, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center" },
  centerState: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 12 },
  stateTitle: { color: colors.text, fontSize: 21, fontWeight: "900", textAlign: "center" },
  stateText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  backToProgress: { minHeight: 50, marginTop: 8, paddingHorizontal: 22, borderRadius: 17, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  backToProgressText: { color: colors.onPrimary, fontSize: 15, fontWeight: "900" },
});

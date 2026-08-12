import type { WeekDayItem } from "@/features/programs/program-dashboard";
import type { PersistedProgramExercise, UserProgram } from "@/features/programs/types";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export function WeekDaySelector({
  week,
  selectedDateKey,
  onSelect,
}: {
  week: WeekDayItem[];
  selectedDateKey: string;
  onSelect: (dateKey: string) => void;
}) {
  const { styles } = useDashboardTheme();
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.dayContent}
      showsHorizontalScrollIndicator={false}
    >
      {week.map((day) => {
        const selected = day.dateKey === selectedDateKey;
        return (
          <Pressable
            accessibilityLabel={`${day.shortLabel}, ayın ${day.dayNumber}. günü`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={day.dateKey}
            onPress={() => onSelect(day.dateKey)}
            style={({ pressed }) => [
              styles.dayCard,
              selected && styles.selectedControl,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.dayLabel, selected && styles.selectedText]}>
              {day.shortLabel}
            </Text>
            <Text style={[styles.dayNumber, selected && styles.selectedText]}>
              {day.dayNumber}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ProgramSummaryCard({
  program,
  completion,
  onEdit,
}: {
  program: UserProgram;
  completion: number;
  onEdit: (programId: string) => void;
}) {
  const { colors, styles } = useDashboardTheme();
  return (
    <View style={styles.programCard}>
      <View style={styles.programHeader}>
        <Text numberOfLines={2} style={styles.programName}>
          {program.name}
        </Text>
        <Text style={styles.completionText}>%{completion}</Text>
        <Pressable
          accessibilityLabel={`${program.name} programını düzenle`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onEdit(program.id)}
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.progressTrack}>
        <View
          accessibilityLabel={`Program yüzde ${completion} tamamlandı`}
          style={[styles.progressFill, { width: `${completion}%` }]}
        />
      </View>
    </View>
  );
}

export function ProgramPills({
  programs,
  activeProgramId,
  onSelect,
}: {
  programs: UserProgram[];
  activeProgramId: string | null;
  onSelect: (programId: string) => void;
}) {
  const { styles } = useDashboardTheme();
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.pillContent}
      showsHorizontalScrollIndicator={false}
    >
      {programs.map((program) => {
        const selected = program.id === activeProgramId;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={program.id}
            onPress={() => onSelect(program.id)}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.selectedControl,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.pillText, selected && styles.selectedText]}
            >
              {program.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function WeeklyTrainingChart({
  values,
}: {
  values: { dateKey: string; shortLabel: string; value: number }[];
}) {
  const { styles } = useDashboardTheme();
  const maximum = Math.max(1, ...values.map((item) => Math.max(0, item.value)));
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Haftalık antrenman grafiği</Text>
      <View style={styles.chartRow}>
        {values.map((item) => {
          const ratio = Math.min(1, Math.max(0, item.value / maximum));
          return (
            <View key={item.dateKey} style={styles.chartColumn}>
              <View style={styles.barArea}>
                <View
                  accessibilityLabel={`${item.shortLabel}: ${item.value} tamamlanan egzersiz`}
                  style={[
                    styles.bar,
                    item.value === 0 && styles.emptyBar,
                    { height: item.value === 0 ? 4 : Math.max(18, ratio * 88) },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.shortLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function ProgramExerciseRow({
  exercise,
  completed,
}: {
  exercise: PersistedProgramExercise;
  completed: boolean;
}) {
  const { colors, styles } = useDashboardTheme();
  return (
    <View
      accessibilityLabel={`${exercise.name}, ${completed ? "tamamlandı" : "tamamlanmadı"}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessible
      style={styles.exerciseRow}
    >
      {completed ? (
        <View style={[styles.statusCircle, styles.statusCircleCompleted]}>
          <Ionicons name="checkmark" size={17} color={colors.onPrimary} />
        </View>
      ) : null}
      <Text
        numberOfLines={2}
        style={[styles.exerciseName, completed && styles.completedExerciseName]}
      >
        {exercise.name}
      </Text>
      <Text style={styles.exerciseValue}>
        {exercise.sets}×{exercise.reps}
      </Text>
    </View>
  );
}

function useDashboardTheme() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
  pressed: { opacity: 0.72 },
  selectedControl: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  selectedText: { color: colors.onPrimary },
  dayContent: { gap: 10, paddingHorizontal: 20 },
  dayCard: {
    width: 68,
    height: 72,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  dayNumber: {
    marginTop: 4,
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  programCard: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  programHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  programName: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  completionText: { color: colors.primary, fontSize: 15, fontWeight: "800" },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 8,
    marginTop: 17,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: colors.disabled,
  },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: colors.primaryBright },
  pillContent: { gap: 10 },
  pill: {
    maxWidth: 220,
    minHeight: 44,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 23,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  pillText: { color: colors.textSecondary, fontSize: 15, fontWeight: "700" },
  chartCard: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  chartTitle: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  chartRow: { height: 130, marginTop: 14, flexDirection: "row", alignItems: "flex-end" },
  chartColumn: { flex: 1, minWidth: 0, alignItems: "center" },
  barArea: { height: 94, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "64%", maxWidth: 40, borderRadius: 7, backgroundColor: colors.primaryBright },
  emptyBar: { backgroundColor: colors.disabled },
  chartLabel: { marginTop: 8, color: colors.textSecondary, fontSize: 11 },
  exerciseRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircleCompleted: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  exerciseName: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  completedExerciseName: { color: colors.textSecondary, textDecorationLine: "line-through" },
  exerciseValue: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  });
}


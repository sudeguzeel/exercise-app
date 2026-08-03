import type { WeekDayItem } from "@/features/programs/program-dashboard";
import type { PersistedProgramExercise, UserProgram } from "@/features/programs/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
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
          <Ionicons name="pencil-outline" size={20} color={MainColors.mutedText} />
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
  return (
    <View style={styles.exerciseRow}>
      <View style={[styles.statusCircle, completed && styles.statusCircleCompleted]}>
        {completed ? (
          <Ionicons name="checkmark" size={17} color={MainColors.text} />
        ) : null}
      </View>
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

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  selectedControl: {
    borderColor: MainColors.primaryBright,
    backgroundColor: MainColors.primaryBright,
  },
  selectedText: { color: MainColors.text },
  dayContent: { gap: 10, paddingHorizontal: 20 },
  dayCard: {
    width: 68,
    height: 72,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: { color: MainColors.mutedText, fontSize: 13, fontWeight: "600" },
  dayNumber: {
    marginTop: 4,
    color: MainColors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  programCard: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
  },
  programHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  programName: {
    flex: 1,
    color: MainColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  completionText: { color: MainColors.primary, fontSize: 15, fontWeight: "800" },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MainColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 8,
    marginTop: 17,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: MainColors.border,
  },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: MainColors.primaryBright },
  pillContent: { gap: 10 },
  pill: {
    maxWidth: 220,
    minHeight: 44,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 23,
    backgroundColor: MainColors.surface,
    justifyContent: "center",
  },
  pillText: { color: MainColors.mutedText, fontSize: 15, fontWeight: "700" },
  chartCard: {
    padding: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
  },
  chartTitle: { color: MainColors.mutedText, fontSize: 15, fontWeight: "600" },
  chartRow: { height: 130, marginTop: 14, flexDirection: "row", alignItems: "flex-end" },
  chartColumn: { flex: 1, minWidth: 0, alignItems: "center" },
  barArea: { height: 94, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "64%", maxWidth: 40, borderRadius: 7, backgroundColor: MainColors.primaryBright },
  emptyBar: { backgroundColor: MainColors.border },
  chartLabel: { marginTop: 8, color: MainColors.mutedText, fontSize: 11 },
  exerciseRow: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCircleCompleted: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.primaryBright },
  exerciseName: { flex: 1, color: MainColors.text, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  completedExerciseName: { color: MainColors.mutedText, textDecorationLine: "line-through" },
  exerciseValue: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
});


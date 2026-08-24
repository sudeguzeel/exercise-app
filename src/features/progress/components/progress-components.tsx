import {
  formatCompletionDuration,
} from "@/features/workouts/workout-domain";
import {
  formatDecimal,
  formatLocalWorkoutDate,
  formatLocalWorkoutTime,
  formatRelativeUpdate,
  formatWeightKg,
} from "@/features/progress/progress-domain";
import type {
  ExerciseWeightItem,
  ProgressPeriod,
} from "@/features/progress/types";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function RoundBackButton({ onPress }: { onPress: () => void }) {
  const { colors, styles } = useProgressTheme();
  return (
    <Pressable
      accessibilityLabel="Geri dön"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={21} color={colors.text} />
    </Pressable>
  );
}

export function PeriodSelector({
  value,
  onChange,
}: {
  value: ProgressPeriod;
  onChange: (period: ProgressPeriod) => void;
}) {
  const { styles } = useProgressTheme();
  const options: { id: ProgressPeriod; label: string }[] = [
    { id: "week", label: "Hafta" },
    { id: "month", label: "Ay" },
    { id: "year", label: "Yıl" },
  ];
  return (
    <View style={styles.periodRow}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.id}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.periodButton,
              selected && styles.periodButtonSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.periodText,
                selected && styles.periodTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
}) {
  const { styles } = useProgressTheme();

  return (
    <View style={styles.statCard}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <View style={styles.statValueRow}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statValue}>
          {value}
        </Text>
        {highlight ? (
          <View accessibilityLabel="Alev" style={styles.streakFlame}>
            <Text style={styles.streakFlameEmoji}>🔥</Text>
          </View>
        ) : null}
      </View>
      {detail ? (
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.statDetail}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionTitle({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  const { styles } = useProgressTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyContent({
  icon,
  title,
  description,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  description?: string;
}) {
  const { colors, styles } = useProgressTheme();
  return (
    <View style={styles.emptyContent}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      </View>
    </View>
  );
}

export function WeightSummaryRow({ item }: { item: ExerciseWeightItem }) {
  const { colors, styles } = useProgressTheme();
  const difference =
    item.previousWeightKg === null
      ? null
      : item.weightKg - item.previousWeightKg;
  return (
    <View style={styles.weightRow}>
      <View style={styles.smallIconBox}>
        <Ionicons name="barbell-outline" size={19} color={colors.textSecondary} />
      </View>
      <View style={styles.weightCopy}>
        <Text numberOfLines={1} style={styles.weightName}>
          {item.exerciseName}
        </Text>
        <Text numberOfLines={1} style={styles.weightMeta}>
          {[item.muscleGroupName, formatRelativeUpdate(item.updatedAt)]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <View style={styles.weightValueBox}>
        <Text style={styles.weightValue}>{formatWeightKg(item.weightKg)}</Text>
        {difference !== null && difference !== 0 ? (
          <Text style={styles.weightChange}>
            {difference > 0 ? "+" : ""}
            {formatDecimal(difference)} kg
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function HistoryCard({
  completion,
  onPress,
}: {
  completion: WorkoutCompletion;
  onPress: () => void;
}) {
  const { colors, styles } = useProgressTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.historyCard, pressed && styles.pressed]}
    >
      <View style={styles.historyCopy}>
        <Text style={styles.historyDate}>
          {formatLocalWorkoutDate(completion.completedAt)} · {formatLocalWorkoutTime(completion.completedAt)}
        </Text>
        <Text style={styles.historyName}>{completion.programName}</Text>
        <Text style={styles.historyMeta}>
          {formatCompletionDuration(completion.durationMs)} · {completion.completedExerciseCount} hareket
        </Text>
      </View>
      <View style={styles.historyAction}>
        <Ionicons name="checkmark" size={17} color={colors.onPrimary} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

function useProgressTheme() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  pressed: { opacity: 0.7 },
  roundButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  periodRow: { flexDirection: "row", gap: 10 },
  periodButton: {
    minWidth: 62,
    minHeight: 42,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  periodButtonSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  periodText: { color: colors.textSecondary, fontSize: 15, fontWeight: "800" },
  periodTextSelected: { color: colors.onPrimary },
  statCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 98,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  statLabelRow: { minHeight: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  statLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  statValueRow: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  statValue: { color: colors.text, fontSize: 21, fontWeight: "900" },
  statDetail: { marginTop: 4, color: colors.primary, fontSize: 10, fontWeight: "900" },
  streakFlame: { width: 28, height: 31, alignItems: "center", justifyContent: "flex-end" },
  streakFlameEmoji: { position: "absolute", bottom: 0, width: 28, fontSize: 25, lineHeight: 31, textAlign: "center" },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: "900", letterSpacing: 0.4 },
  sectionAction: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  emptyContent: { paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  emptyDescription: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  weightRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  smallIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  weightCopy: { flex: 1, minWidth: 0 },
  weightName: { color: colors.text, fontSize: 15, fontWeight: "900" },
  weightMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
  weightValueBox: { alignItems: "flex-end" },
  weightValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  weightChange: { marginTop: 3, color: colors.primary, fontSize: 10, fontWeight: "900" },
  historyCard: { minHeight: 106, padding: 16, borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 8 },
  historyCopy: { flex: 1, minWidth: 0 },
  historyDate: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  historyName: { marginTop: 7, color: colors.text, fontSize: 18, fontWeight: "900" },
  historyMeta: { marginTop: 5, color: colors.textSecondary, fontSize: 12 },
  historyAction: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
});
    
   

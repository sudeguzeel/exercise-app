import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import type {
  WorkoutExerciseSnapshot,
  WorkoutSetSnapshot,
} from "@/features/workouts/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export function WorkoutTopBar({
  elapsed,
  onBack,
  onExit,
}: {
  elapsed: string;
  onBack: () => void;
  onExit: () => void;
}) {
  const { colors, styles } = useWorkoutComponentTheme();
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text
        accessibilityLabel={`${elapsed} geçen süre`}
        accessibilityRole="timer"
        style={styles.elapsedLabel}
      >
        <Text style={styles.elapsedValue}>{elapsed}</Text> geçen süre
      </Text>
      <Pressable
        accessibilityLabel="Antrenmanı kapat"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onExit}
        style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function ExerciseInfoCard({
  exercise,
  exerciseIndex,
  totalExercises,
}: {
  exercise: WorkoutExerciseSnapshot;
  exerciseIndex: number;
  totalExercises: number;
}) {
  const { styles } = useWorkoutComponentTheme();
  const detail = [
    exercise.muscleGroupName,
    `${exercise.targetSets} set × ${exercise.targetReps} tekrar`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoEyebrow}>
        HAREKET {exerciseIndex + 1} / {totalExercises}
      </Text>
      <Text numberOfLines={3} style={styles.exerciseTitle}>
        {exercise.name}
      </Text>
      <Text numberOfLines={2} style={styles.exerciseDetail}>
        {detail}
      </Text>
    </View>
  );
}

export function ExerciseMedia({
  exerciseName,
  mediaUrl,
}: {
  exerciseName: string;
  mediaUrl: string | null;
}) {
  const { colors, styles } = useWorkoutComponentTheme();
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">(
    "idle",
  );

  useEffect(() => setState("idle"), [mediaUrl]);

  const canPlay = Boolean(mediaUrl);
  return (
    <View style={styles.mediaCard}>
      {mediaUrl && state !== "idle" && state !== "error" ? (
        <View style={styles.mediaFrame}>
          <Image
            accessibilityLabel={`${exerciseName} hareket animasyonu`}
            autoplay
            contentFit="contain"
            onError={() => setState("error")}
            onLoad={() => setState("playing")}
            recyclingKey={mediaUrl}
            source={{ uri: mediaUrl }}
            style={styles.mediaImage}
          />
          {state === "loading" ? (
            <View style={styles.mediaLoading}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.mediaPlaceholder}>
          <Pressable
            accessibilityLabel="Hareketin doğru yapılışını oynat"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPlay }}
            disabled={!canPlay}
            onPress={() => setState("loading")}
            style={({ pressed }) => [
              styles.playButton,
              !canPlay && styles.playButtonDisabled,
              pressed && canPlay && styles.pressed,
            ]}
          >
            {state === "loading" ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Ionicons name="play" size={27} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      )}
      <Text style={styles.mediaCaption}>
        {state === "error"
          ? "Hareket videosu yüklenemedi"
          : canPlay
            ? "Hareketin doğru yapılışını izle"
            : "Bu hareket için medya bulunmuyor"}
      </Text>
    </View>
  );
}

export function SetSelector({
  sets,
  activeSetId,
}: {
  sets: WorkoutSetSnapshot[];
  activeSetId: string | null;
}) {
  const { styles } = useWorkoutComponentTheme();
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.setContent}
      showsHorizontalScrollIndicator={false}
    >
      {sets.map((set) => {
        const completed = Boolean(set.completedAt);
        const active = set.id === activeSetId;
        return (
          <View
            accessible
            accessibilityLabel={`Set ${set.setNumber}${completed ? ", tamamlandı" : active ? ", aktif" : ", bekliyor"}`}
            accessibilityRole="text"
            key={set.id}
            style={[
              styles.setPill,
              completed && styles.completedSet,
              active && styles.activeSet,
              !completed && !active && styles.pendingSet,
            ]}
          >
            <Text style={[styles.setText, active && styles.activeSetText]}>
              Set {set.setNumber}{completed ? " ✓" : ""}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function TargetRepetitionCard({ value }: { value: number }) {
  const { styles } = useWorkoutComponentTheme();
  return (
    <View
      accessibilityLabel={`Hedef tekrar: ${value}`}
      accessible
      style={styles.targetCard}
    >
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.targetValue}>
        {value}
      </Text>
      <Text style={styles.targetUnit}>TEKRAR</Text>
    </View>
  );
}


export function SetPerformanceInputs({
  actualReps,
  weight,
  disabled,
  onActualRepsChange,
  onWeightChange,
}: {
  actualReps: string;
  weight: string;
  disabled: boolean;
  onActualRepsChange: (value: string) => void;
  onWeightChange: (value: string) => void;
}) {
  const { colors, styles } = useWorkoutComponentTheme();
  return (
    <View style={styles.performanceRow}>
      <View style={styles.performanceField}>
        <Text style={styles.performanceLabel}>GERÇEK TEKRAR</Text>
        <View style={styles.performanceInputShell}>
          <TextInput
            accessibilityLabel="Gerçekleştirilen tekrar sayısı"
            editable={!disabled}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={(value) => onActualRepsChange(value.replace(/\D/g, ""))}
            selectTextOnFocus
            style={styles.performanceInput}
            value={actualReps}
          />
          <Text style={styles.performanceUnit}>TEKRAR</Text>
        </View>
      </View>
      <View style={styles.performanceField}>
        <Text style={styles.performanceLabel}>KULLANILAN KİLO</Text>
        <View style={styles.performanceInputShell}>
          <TextInput
            accessibilityLabel="Bu sette kullanılan kilo"
            editable={!disabled}
            inputMode="decimal"
            keyboardType="decimal-pad"
            maxLength={6}
            onChangeText={onWeightChange}
            placeholder="—"
            placeholderTextColor={colors.placeholder}
            selectTextOnFocus
            style={styles.performanceInput}
            value={weight}
          />
          <Text style={styles.performanceUnit}>kg</Text>
        </View>
      </View>
    </View>
  );
}

function useWorkoutComponentTheme() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return { colors, styles };
}
function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({

  pressed: { opacity: 0.7 },
  topBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  elapsedLabel: { flex: 1, color: colors.textSecondary, fontSize: 13, textAlign: "center" },
  elapsedValue: { color: colors.primaryBright, fontWeight: "900" },
  infoCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
  },
  infoEyebrow: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
  exerciseTitle: { marginTop: 9, color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: "900" },
  exerciseDetail: { marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  mediaCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  mediaFrame: { width: "100%", maxHeight: 280, aspectRatio: 16 / 9, backgroundColor: colors.primarySoft },
  mediaImage: { width: "100%", height: "100%" },
  mediaLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  mediaPlaceholder: { width: "100%", maxHeight: 280, aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  playButtonDisabled: { backgroundColor: colors.disabled, opacity: 0.7 },
  mediaCaption: { paddingHorizontal: 14, paddingVertical: 12, color: colors.textSecondary, fontSize: 12 },
  setContent: { gap: 8 },
  setPill: { minWidth: 78, minHeight: 42, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  completedSet: { borderColor: colors.primaryBright, backgroundColor: colors.primarySoft },
  activeSet: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  pendingSet: { opacity: 0.52 },

  setText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  activeSetText: { color: colors.onPrimary, fontWeight: "900" },
  targetCard: { minHeight: 78, paddingHorizontal: 20, borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  targetValue: { color: colors.text, fontSize: 29, fontWeight: "900" },
  targetUnit: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  performanceRow: { flexDirection: "row", gap: 10 },
  performanceField: { flex: 1, minWidth: 0 },
  performanceLabel: {
    marginBottom: 8,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  performanceInputShell: {
    minHeight: 58,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  performanceInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  performanceUnit: {
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: "800",
  },
  });
}

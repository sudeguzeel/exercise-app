import { MainColors } from "@/shared/constants/theme";
import type {
  WorkoutExerciseSnapshot,
  WorkoutSetSnapshot,
} from "@/features/workouts/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        hitSlop={6}
        onPress={onBack}
        style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={MainColors.text} />
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
        <Ionicons name="close" size={24} color={MainColors.text} />
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
              <ActivityIndicator color={MainColors.primary} size="large" />
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
              <ActivityIndicator color={MainColors.text} />
            ) : (
              <Ionicons name="play" size={27} color={MainColors.text} />
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

const styles = StyleSheet.create({
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
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  elapsedLabel: { flex: 1, color: MainColors.mutedText, fontSize: 13, textAlign: "center" },
  elapsedValue: { color: MainColors.primaryBright, fontWeight: "900" },
  infoCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#171B1E",
  },
  infoEyebrow: { color: "#92979A", fontSize: 12, fontWeight: "800" },
  exerciseTitle: { marginTop: 9, color: "#FFFFFF", fontSize: 24, lineHeight: 29, fontWeight: "900" },
  exerciseDetail: { marginTop: 7, color: "#B3B7B9", fontSize: 13, lineHeight: 18 },
  mediaCard: {
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    overflow: "hidden",
  },
  mediaFrame: { width: "100%", maxHeight: 280, aspectRatio: 16 / 9, backgroundColor: MainColors.paleGreen },
  mediaImage: { width: "100%", height: "100%" },
  mediaLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: MainColors.paleGreen },
  mediaPlaceholder: { width: "100%", maxHeight: 280, aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center", backgroundColor: MainColors.paleGreen },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: MainColors.primaryBright, alignItems: "center", justifyContent: "center" },
  playButtonDisabled: { backgroundColor: MainColors.border, opacity: 0.7 },
  mediaCaption: { paddingHorizontal: 14, paddingVertical: 12, color: MainColors.mutedText, fontSize: 12 },
  setContent: { gap: 8 },
  setPill: { minWidth: 78, minHeight: 42, paddingHorizontal: 14, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 14, backgroundColor: MainColors.surface, alignItems: "center", justifyContent: "center" },
  completedSet: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.paleGreen },
  activeSet: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.primaryBright },
  pendingSet: { opacity: 0.52 },
  setText: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  activeSetText: { color: MainColors.text, fontWeight: "900" },
  targetCard: { minHeight: 78, paddingHorizontal: 20, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 22, backgroundColor: MainColors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  targetValue: { color: MainColors.text, fontSize: 29, fontWeight: "900" },
  targetUnit: { color: MainColors.mutedText, fontSize: 10, fontWeight: "800" },
});

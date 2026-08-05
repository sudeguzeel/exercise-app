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
  TextInput,
  View,
} from "react-native";

export function WorkoutTopBar({
  elapsed,
  onExit,
}: {
  elapsed: string;
  onExit: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        onPress={onExit}
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
  viewedSetId,
  onSelect,
}: {
  sets: WorkoutSetSnapshot[];
  activeSetId: string | null;
  viewedSetId: string;
  onSelect: (setId: string) => void;
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
        const selected = set.id === viewedSetId;
        const disabled = !completed && !active;
        return (
          <Pressable
            accessibilityLabel={`Set ${set.setNumber}${completed ? ", tamamlandı" : active ? ", aktif" : ", bekliyor"}`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={set.id}
            onPress={() => onSelect(set.id)}
            style={({ pressed }) => [
              styles.setPill,
              completed && styles.completedSet,
              active && styles.activeSet,
              selected && completed && styles.viewedCompletedSet,
              disabled && styles.pendingSet,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.setText, active && styles.activeSetText]}>
              Set {set.setNumber}{completed ? " ✓" : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function RepetitionCounter({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const decreaseDisabled = disabled || value <= 1;
  const increaseDisabled = disabled || value >= 100;
  return (
    <View style={styles.counterCard}>
      <CounterButton
        accessibilityLabel="Tekrar sayısını azalt"
        disabled={decreaseDisabled}
        icon="remove"
        onPress={() => onChange(Math.max(1, value - 1))}
      />
      <View style={styles.counterValueWrap}>
        <Text style={styles.counterValue}>{value}</Text>
        <Text style={styles.counterUnit}>TEKRAR</Text>
      </View>
      <CounterButton
        accessibilityLabel="Tekrar sayısını artır"
        disabled={increaseDisabled}
        icon="add"
        onPress={() => onChange(Math.min(100, value + 1))}
      />
    </View>
  );
}

function CounterButton({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: "add" | "remove";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.counterButton,
        disabled && styles.controlDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={MainColors.text} />
    </Pressable>
  );
}

export function WeightInput({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <View style={[styles.weightField, error && styles.weightFieldError]}>
        <TextInput
          accessibilityLabel="Kullandığın ağırlık"
          editable={!disabled}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={MainColors.mutedText}
          style={styles.weightTextInput}
          value={value}
        />
        <Text style={styles.weightUnit}>kg</Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
        {error ?? " "}
      </Text>
    </>
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
    minHeight: 190,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    overflow: "hidden",
  },
  mediaFrame: { height: 154, backgroundColor: MainColors.paleGreen },
  mediaImage: { width: "100%", height: "100%" },
  mediaLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: MainColors.paleGreen },
  mediaPlaceholder: { height: 154, alignItems: "center", justifyContent: "center", backgroundColor: MainColors.paleGreen },
  playButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: MainColors.primaryBright, alignItems: "center", justifyContent: "center" },
  playButtonDisabled: { backgroundColor: MainColors.border, opacity: 0.7 },
  mediaCaption: { paddingHorizontal: 14, paddingVertical: 12, color: MainColors.mutedText, fontSize: 12 },
  setContent: { gap: 8 },
  setPill: { minWidth: 78, minHeight: 42, paddingHorizontal: 14, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 14, backgroundColor: MainColors.surface, alignItems: "center", justifyContent: "center" },
  completedSet: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.paleGreen },
  activeSet: { borderColor: MainColors.primaryBright, backgroundColor: MainColors.primaryBright },
  viewedCompletedSet: { borderWidth: 2.5 },
  pendingSet: { opacity: 0.52 },
  setText: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  activeSetText: { color: MainColors.text, fontWeight: "900" },
  counterCard: { minHeight: 82, paddingHorizontal: 14, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 22, backgroundColor: MainColors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counterButton: { width: 46, height: 46, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 15, backgroundColor: MainColors.paleGreen, alignItems: "center", justifyContent: "center" },
  controlDisabled: { opacity: 0.42 },
  counterValueWrap: { alignItems: "center" },
  counterValue: { color: MainColors.text, fontSize: 27, fontWeight: "900" },
  counterUnit: { marginTop: 2, color: MainColors.mutedText, fontSize: 10, fontWeight: "700" },
  weightField: { height: 54, paddingHorizontal: 14, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 17, backgroundColor: MainColors.surface, flexDirection: "row", alignItems: "center" },
  weightFieldError: { borderColor: "#D14343" },
  weightTextInput: { flex: 1, height: "100%", paddingVertical: 0, color: MainColors.text, fontSize: 16 },
  weightUnit: { color: MainColors.primary, fontSize: 14, fontWeight: "900" },
  fieldError: { minHeight: 18, marginTop: 5, color: "#D14343", fontSize: 12, fontWeight: "600" },
});

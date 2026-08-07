import { formatRestDuration } from "@/features/exercises/program-exercise-rest";
import { MAX_REST_SECONDS } from "@/features/workouts/workout-domain";
import type { WorkoutSetPosition } from "@/features/workouts/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

const RING_SIZE = 196;
const RING_RADIUS = 87;
const RING_SEGMENTS = 48;

export function RestHeaderCard({ completedSetNumber }: { completedSetNumber: number }) {
  return (
    <View style={styles.headerCard}>
      <Text style={styles.eyebrow}>SET {completedSetNumber} TAMAMLANDI</Text>
      <Text style={styles.headerTitle}>Dinlenme zamanı</Text>
    </View>
  );
}

export function RestProgressRing({
  durationSeconds,
  remainingSeconds,
}: {
  durationSeconds: number;
  remainingSeconds: number;
}) {
  const safeRemaining = Math.min(
    MAX_REST_SECONDS,
    Math.max(0, remainingSeconds),
  );
  const safeDuration = Math.max(1, Math.min(MAX_REST_SECONDS, durationSeconds));
  const activeSegments = Math.ceil(
    Math.min(1, safeRemaining / safeDuration) * RING_SEGMENTS,
  );
  const formatted = formatRestDuration(safeRemaining);

  return (
    <View
      accessibilityLabel={`${formatted}, dinlenme süresi kaldı`}
      accessibilityRole="timer"
      style={styles.ring}
    >
      {Array.from({ length: RING_SEGMENTS }, (_, index) => {
        const angle = (index / RING_SEGMENTS) * Math.PI * 2 - Math.PI / 2;
        return (
          <View
            key={index}
            style={[
              styles.ringSegment,
              index < activeSegments
                ? styles.ringSegmentActive
                : styles.ringSegmentInactive,
              {
                left: RING_SIZE / 2 + Math.cos(angle) * RING_RADIUS - 2,
                top: RING_SIZE / 2 + Math.sin(angle) * RING_RADIUS - 6,
                transform: [{ rotate: `${angle + Math.PI / 2}rad` }],
              },
            ]}
          />
        );
      })}
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.timeValue}>
        {formatted}
      </Text>
      <Text style={styles.timeCaption}>SANİYE KALDI</Text>
    </View>
  );
}

export function NextWorkoutCard({ target }: { target: WorkoutSetPosition }) {
  return (
    <View
      accessibilityLabel={`Sıradaki: Set ${target.set.setNumber}, ${target.exercise.name}, ${target.set.targetReps} tekrar`}
      accessible
      style={styles.nextCard}
    >
      <View style={styles.nextIcon}>
        <Ionicons name="barbell-outline" size={20} color={MainColors.mutedText} />
      </View>
      <View style={styles.nextTextWrap}>
        <Text style={styles.nextLabel}>SIRADAKİ</Text>
        <Text numberOfLines={3} style={styles.nextText}>
          Set {target.set.setNumber} · {target.exercise.name} · {target.set.targetReps}{" "}
          tekrar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    minHeight: 116,
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 24,
    backgroundColor: "#171B1E",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: "#92979A", fontSize: 11, fontWeight: "800" },
  headerTitle: {
    marginTop: 7,
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "center",
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  ringSegment: {
    position: "absolute",
    width: 4,
    height: 12,
    borderRadius: 3,
  },
  ringSegmentActive: { backgroundColor: MainColors.primaryBright },
  ringSegmentInactive: { backgroundColor: MainColors.border },
  timeValue: {
    width: 150,
    color: MainColors.text,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    textAlign: "center",
  },
  timeCaption: {
    marginTop: 2,
    color: MainColors.mutedText,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  nextCard: {
    minHeight: 84,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  nextTextWrap: { flex: 1, minWidth: 0 },
  nextLabel: { color: MainColors.mutedText, fontSize: 10, fontWeight: "800" },
  nextText: {
    marginTop: 4,
    color: MainColors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
});

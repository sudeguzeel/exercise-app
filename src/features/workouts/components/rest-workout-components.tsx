import { formatRestDuration } from "@/features/exercises/program-exercise-rest";
import { MAX_REST_SECONDS } from "@/features/workouts/workout-domain";
import type { WorkoutSetPosition } from "@/features/workouts/types";
import { useAppTheme } from "@/providers/AppThemeContext";
import { RandomMascot } from "@/shared/components/random-mascot";
import { MascotSpeechBubble } from "@/shared/components/mascot-speech-bubble";
import { REST_MASCOTS } from "@/shared/constants/mascot-assets";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

const RING_SIZE = 196;
const RING_RADIUS = 87;
const RING_SEGMENTS = 48;
const REST_MASCOT_VARIANT_STYLES = [
  undefined,
  { transform: [{ scale: 1.12 }] },
  undefined,
] as const;

export function RestHeaderCard({
  completedSetNumber,
  phaseKey,
  mascotMessage,
}: {
  completedSetNumber: number;
  phaseKey: string;
  mascotMessage: string;
}) {
  const { styles } = useRestComponentTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 430;
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerAccent} />
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>SET {completedSetNumber} TAMAMLANDI</Text>
        <Text style={styles.headerTitle}>Dinlenme zamanı</Text>
      </View>
      <View pointerEvents="none" style={styles.headerMascotSlot}>
        <RandomMascot
          key={phaseKey}
          accessibilityLabel="Dinlenen FitRehber tavşan maskotu"
          sources={REST_MASCOTS}
          style={styles.headerMascot}
          variantStyles={REST_MASCOT_VARIANT_STYLES}
        />
      </View>
      <MascotSpeechBubble
        compact
        message={mascotMessage}
        tailDirection="bottom-right"
        style={[
          styles.headerSpeechBubble,
          isCompactWidth
            ? styles.headerSpeechBubbleCompact
            : styles.headerSpeechBubbleWide,
        ]}
      />
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
  const { styles } = useRestComponentTheme();
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
  const { colors, styles } = useRestComponentTheme();
  return (
    <View
      accessibilityLabel={`Sıradaki: Set ${target.set.setNumber}, ${target.exercise.name}, ${target.set.targetReps} tekrar`}
      accessible
      style={styles.nextCard}
    >
      <View style={styles.nextIcon}>
        <Ionicons name="barbell-outline" size={20} color={colors.textSecondary} />
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

function useRestComponentTheme() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return { colors, styles };
}

function createStyles(colors: AppThemeColors, isDark: boolean) {
  return StyleSheet.create({
  headerCard: {
    paddingHorizontal: 22,
    paddingVertical: 20,
    paddingRight: "34%",
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 24,
    backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  headerAccent: { position: "absolute", right: -20, bottom: -48, width: 180, height: 115, borderRadius: 90, backgroundColor: colors.primarySoft, opacity: 0.18 },
  headerCopy: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  headerMascotSlot: { position: "absolute", top: 0, right: 6, bottom: 0, width: "35%", minWidth: 104, maxWidth: 158, alignItems: "center", justifyContent: "center" },
  headerMascot: { width: "100%", height: "100%" },
  headerSpeechBubble: { position: "absolute", top: 7, width: 140, maxWidth: 140, zIndex: 2 },
  headerSpeechBubbleCompact: { right: "32%" },
  headerSpeechBubbleWide: { right: 116 },
  eyebrow: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  headerTitle: {
    marginTop: 7,
    color: colors.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "900",
    textAlign: "left",
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
  ringSegmentActive: { backgroundColor: colors.primaryBright },
  ringSegmentInactive: { backgroundColor: colors.disabled },
  timeValue: {
    width: 150,
    color: colors.text,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "900",
    textAlign: "center",
  },
  timeCaption: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  nextCard: {
    minHeight: 84,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nextTextWrap: { flex: 1, minWidth: 0 },
  nextLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  nextText: {
    marginTop: 4,
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  });
}

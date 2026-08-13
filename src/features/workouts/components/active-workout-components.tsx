import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import type {
  WorkoutExerciseSnapshot,
  WorkoutSetSnapshot,
} from "@/features/workouts/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [state, setState] = useState<"loading" | "playing" | "error">(
    "loading",
  );

  useEffect(() => setState("loading"), [mediaUrl]);

  return (
    <View style={styles.mediaCard}>
      {mediaUrl && state !== "error" ? (
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
        <View style={styles.mediaPlaceholder} />
      )}
      {state === "error" || !mediaUrl ? (
        <Text style={styles.mediaCaption}>
          {state === "error"
            ? "Hareket videosu yüklenemedi"
            : "Bu hareket için medya bulunmuyor"}
        </Text>
      ) : null}
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
      style={styles.setSelector}
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

// Program kaç hareketten oluşuyorsa o kadar nokta gösterir; aktif nokta
// büyür, kullanıcı bir noktaya dokunarak doğrudan o harekete atlayabilir.
// Nokta sayısı ekrana sığmazsa şerit yatay kaydırılabilir ve aktif nokta
// otomatik olarak ekranın ortasına gelecek şekilde kaydırılır.
export function ExerciseDotPagination({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const { styles } = useWorkoutComponentTheme();
  const scrollRef = useRef<ScrollView>(null);
  const containerWidthRef = useRef(0);
  const dotLayoutsRef = useRef<Map<number, { x: number; width: number }>>(
    new Map(),
  );

  const centerOnIndex = useCallback((index: number) => {
    const layout = dotLayoutsRef.current.get(index);
    const containerWidth = containerWidthRef.current;
    if (!layout || !containerWidth) return;
    const target = Math.max(0, layout.x + layout.width / 2 - containerWidth / 2);
    scrollRef.current?.scrollTo({ animated: true, x: target });
  }, []);

  useEffect(() => {
    centerOnIndex(activeIndex);
  }, [activeIndex, centerOnIndex]);

  return (
    <ScrollView
      contentContainerStyle={styles.dotContent}
      horizontal
      onLayout={(event) => {
        containerWidthRef.current = event.nativeEvent.layout.width;
        centerOnIndex(activeIndex);
      }}
      ref={scrollRef}
      showsHorizontalScrollIndicator={false}
      style={styles.dotScroll}
    >
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            accessibilityLabel={`${index + 1}. harekete git`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={8}
            key={index}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              dotLayoutsRef.current.set(index, { x, width });
            }}
            onPress={() => onSelect(index)}
            style={[styles.dot, active && styles.dotActive]}
          />
        );
      })}
    </ScrollView>
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
    minHeight: 170,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
  },
  infoEyebrow: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
  exerciseTitle: { marginTop: 9, color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: "900", textTransform: "capitalize" },
  exerciseDetail: { marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  mediaCard: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  mediaFrame: { width: "100%", maxHeight: 320, aspectRatio: 3 / 2, backgroundColor: colors.primarySoft },
  mediaImage: { width: "100%", height: "100%" },
  mediaLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  mediaPlaceholder: { width: "100%", maxHeight: 320, aspectRatio: 3 / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  mediaCaption: { paddingHorizontal: 14, paddingVertical: 12, color: colors.textSecondary, fontSize: 12 },
  setSelector: { height: 112 },
  setContent: { flexGrow: 1, gap: 8, alignItems: "stretch" },
  setPill: { flexGrow: 1, flexBasis: 0, minWidth: 78, height: 112, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  completedSet: { borderColor: colors.primaryBright, backgroundColor: colors.primarySoft },
  activeSet: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  pendingSet: { opacity: 0.52 },

  setText: { color: colors.textSecondary, fontSize: 13, fontWeight: "700" },
  activeSetText: { color: colors.onPrimary, fontWeight: "900" },
  targetCard: { minHeight: 78, paddingHorizontal: 20, borderWidth: 1.5, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  targetValue: { color: colors.text, fontSize: 29, fontWeight: "900" },
  targetUnit: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  dotScroll: { flexGrow: 0 },
  dotContent: { paddingHorizontal: 4, alignItems: "center", gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 22, backgroundColor: colors.primaryBright },
  });
}

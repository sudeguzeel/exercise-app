import {
  parseProgramSelectionParams,
  type ProgramSelectionSearchParams,
} from "@/features/exercises/program-selection";
import { MainColors } from "@/shared/constants/theme";
import {
  getExerciseSummary,
  type ExerciseSummary,
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgramScreen() {
  const searchParams =
    useLocalSearchParams<ProgramSelectionSearchParams>();
  const selection = useMemo(
    () => parseProgramSelectionParams(searchParams),
    [searchParams],
  );
  const [exercise, setExercise] = useState<ExerciseSummary | null>(null);

  useEffect(() => {
    if (!selection) {
      setExercise(null);
      return;
    }
    let mounted = true;
    void getExerciseSummary(selection.exerciseId).then((result) => {
      if (mounted) setExercise(result);
    });
    return () => {
      mounted = false;
    };
  }, [selection]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>
          {selection && exercise ? "Program seçimi" : "Program"}
        </Text>

        {selection && exercise ? (
          <>
            <Text maxFontSizeMultiplier={1.3} style={styles.description}>
              Egzersiz ve kullanılacak değerler program seçimi için hazır.
            </Text>

            <View style={styles.selectionCard}>
              <View style={styles.exerciseIcon}>
                <Ionicons
                  name={exercise.icon}
                  size={34}
                  color={MainColors.primary}
                />
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.exerciseName}>
                {exercise.name}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.valueSource}>
                {exercise.bodyPartName}
              </Text>

              <View style={styles.metrics}>
                <ProgramMetric label="SET" value={String(selection.sets)} />
                <ProgramMetric
                  label="TEKRAR"
                  value={String(selection.reps)}
                />
                <ProgramMetric
                  label="DİNLENME"
                  value={`${selection.restSeconds} sn`}
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/exercise")}
              style={({ pressed }) => [
                styles.backToExercises,
                pressed && styles.backToExercisesPressed,
              ]}
            >
              <Text style={styles.backToExercisesText}>
                Egzersizlere dön
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="document-text-outline"
              size={42}
              color={MainColors.primary}
            />
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
              Program ekranı yakında burada olacak.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

type ProgramMetricProps = {
  label: string;
  value: string;
};

function ProgramMetric({ label, value }: ProgramMetricProps) {
  return (
    <View style={styles.metric}>
      <Text maxFontSizeMultiplier={1.3} style={styles.metricLabel}>
        {label}
      </Text>
      <Text
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
        minimumFontScale={0.75}
        numberOfLines={1}
        style={styles.metricValue}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MainColors.background,
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 24,
  },
  title: {
    marginTop: 24,
    color: MainColors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  description: {
    marginTop: 8,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  selectionCard: {
    marginTop: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
  },
  exerciseIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseName: {
    marginTop: 18,
    color: MainColors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  valueSource: {
    marginTop: 5,
    color: MainColors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  metrics: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    height: 82,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: MainColors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },
  metricValue: {
    marginTop: 5,
    color: MainColors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  backToExercises: {
    height: 54,
    marginTop: 20,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  backToExercisesPressed: {
    backgroundColor: MainColors.primary,
  },
  backToExercisesText: {
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  emptyCard: {
    marginTop: 28,
    padding: 28,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 12,
    color: MainColors.mutedText,
    fontSize: 15,
    textAlign: "center",
  },
});

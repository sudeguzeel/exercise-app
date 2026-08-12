import { programRepository } from "@/features/programs/program-repository";
import type { UserProgram } from "@/features/programs/types";
import type { TrainingDay } from "@/providers/OnboardingContext";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TRAINING_DAYS: TrainingDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export default function ProgramDaySelectionScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    selectedDate?: string | string[];
    initialTrainingDay?: string | string[];
  }>();
  const selectedDate = singleParam(params.selectedDate) ?? "";
  const dayValue = singleParam(params.initialTrainingDay);
  const trainingDay = TRAINING_DAYS.includes(dayValue as TrainingDay)
    ? (dayValue as TrainingDay)
    : null;
  const [programs, setPrograms] = useState<UserProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void programRepository
      .listPrograms()
      .then((items) => {
        if (mounted) setPrograms(items);
      })
      .catch(() => {
        Alert.alert("Programlar yüklenemedi", "Lütfen tekrar deneyin.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const availablePrograms = trainingDay
    ? programs.filter((program) => !program.trainingDays.includes(trainingDay))
    : [];

  const addExistingProgram = useCallback(
    async (program: UserProgram) => {
      if (!trainingDay || submittingId) return;
      setSubmittingId(program.id);
      try {
        await programRepository.updateProgram({
          id: program.id,
          name: program.name,
          trainingDays: [...program.trainingDays, trainingDay],
          muscleGroupIds: program.muscleGroupIds,
          exercises: program.exercises,
        });
        router.replace({
          pathname: "/(main)/program",
          params: { selectedDate, activeProgramId: program.id },
        });
      } catch {
        Alert.alert("Program eklenemedi", "Lütfen tekrar deneyin.");
        setSubmittingId(null);
      }
    },
    [selectedDate, submittingId, trainingDay],
  );

  const createNewProgram = useCallback(() => {
    router.push({
      pathname: "/exercise" as never,
      params: {
        selectionMode: "new-program",
        selectedDate,
        ...(trainingDay ? { initialTrainingDay: trainingDay } : {}),
      },
    });
  }, [selectedDate, trainingDay]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Program ekle</Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : availablePrograms.length > 0 ? (
          availablePrograms.map((program) => (
            <Pressable
              accessibilityRole="button"
              disabled={submittingId !== null}
              key={program.id}
              onPress={() => void addExistingProgram(program)}
              style={({ pressed }) => [
                styles.programCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.programInfo}>
                <Text style={styles.programName}>{program.name}</Text>
                <Text style={styles.programDetail}>
                  {program.exercises.length} hareket
                </Text>
              </View>
              {submittingId === program.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="add-circle-outline" size={25} color={colors.primary} />
              )}
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>Bu güne eklenebilecek başka program yok.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={createNewProgram}
          style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}
        >
          <Text style={styles.createButtonText}>+ Yeni program oluştur</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerSpace: { width: 25 },
    title: { color: colors.text, fontSize: 20, fontWeight: "900" },
    content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 12 },
    programCard: {
      minHeight: 72,
      paddingHorizontal: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    programInfo: { flex: 1 },
    programName: { color: colors.text, fontSize: 16, fontWeight: "900" },
    programDetail: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
    emptyText: { color: colors.textSecondary, fontSize: 14 },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    createButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: colors.primaryBright,
      alignItems: "center",
      justifyContent: "center",
    },
    createButtonText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
    pressed: { opacity: 0.72 },
  });

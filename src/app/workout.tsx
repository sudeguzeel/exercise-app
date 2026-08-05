import { isValidProgramId, programRepository } from "@/features/programs/program-repository";
import type { UserProgram } from "@/features/programs/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{
    programId?: string | string[];
    workoutDate?: string | string[];
  }>();
  const programId = singleParam(params.programId)?.trim() ?? "";
  const workoutDate = singleParam(params.workoutDate);
  const [program, setProgram] = useState<UserProgram | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  const loadProgram = useCallback(async () => {
    if (!isValidProgramId(programId)) {
      setProgram(null);
      return;
    }
    setProgram(undefined);
    setLoadError(false);
    try {
      setProgram(await programRepository.getProgramById(programId));
    } catch {
      setLoadError(true);
    }
  }, [programId]);

  useEffect(() => {
    void loadProgram();
  }, [loadProgram]);

  const goBack = () =>
    router.replace({
      pathname: "/(main)/program",
      params: {
        ...(workoutDate ? { selectedDate: workoutDate } : {}),
        ...(program ? { activeProgramId: program.id } : {}),
      },
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Programlara geri dön"
          accessibilityRole="button"
          onPress={goBack}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={MainColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Antrenman</Text>
        <View style={styles.headerSpacer} />
      </View>

      {program === undefined && !loadError ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={MainColors.primary} size="large" />
          <Text style={styles.mutedText}>Program hazırlanıyor…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={38} color={MainColors.primary} />
          <Text style={styles.title}>Program hazırlanamadı</Text>
          <Pressable onPress={() => void loadProgram()} style={styles.retryButton}>
            <Text style={styles.retryText}>Yeniden dene</Text>
          </Pressable>
        </View>
      ) : program ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>SEÇİLİ PROGRAM</Text>
            <Text style={styles.title}>{program.name}</Text>
            <Text style={styles.mutedText}>
              {program.exercises.length} egzersiz antrenman için hazır.
            </Text>
          </View>
          {program.exercises.map((exercise, index) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <View style={styles.indexCircle}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <Text numberOfLines={2} style={styles.exerciseName}>
                {exercise.name}
              </Text>
              <Text style={styles.exerciseValue}>
                {exercise.sets}×{exercise.reps}
              </Text>
            </View>
          ))}
          <Text style={styles.scopeNote}>
            Bu ekran seçili programı antrenman akışına hazırlar. Tamamlama kaydı
            oluşturan backend akışı bu görevin kapsamına dahil edilmemiştir.
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.centerState}>
          <Text style={styles.title}>Program bulunamadı</Text>
          <Pressable onPress={goBack} style={styles.retryButton}>
            <Text style={styles.retryText}>Programlara dön</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  header: {
    height: 72,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 21,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: MainColors.mutedText, fontSize: 16, fontWeight: "700" },
  headerSpacer: { width: 42 },
  centerState: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 14 },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: 18, gap: 10 },
  heroCard: {
    marginBottom: 8,
    padding: 22,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
  },
  eyebrow: { color: MainColors.primary, fontSize: 12, fontWeight: "900" },
  title: { marginTop: 6, color: MainColors.text, fontSize: 22, fontWeight: "900", textAlign: "center" },
  mutedText: { marginTop: 7, color: MainColors.mutedText, fontSize: 14, lineHeight: 20, textAlign: "center" },
  exerciseRow: {
    minHeight: 62,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  indexCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: MainColors.paleGreen, alignItems: "center", justifyContent: "center" },
  indexText: { color: MainColors.primary, fontWeight: "900" },
  exerciseName: { flex: 1, color: MainColors.text, fontSize: 15, fontWeight: "700" },
  exerciseValue: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  retryButton: { minHeight: 46, paddingHorizontal: 22, borderRadius: 18, backgroundColor: MainColors.primaryBright, justifyContent: "center" },
  retryText: { color: MainColors.text, fontWeight: "800" },
  scopeNote: { padding: 16, color: MainColors.mutedText, fontSize: 12, lineHeight: 18, textAlign: "center" },
});

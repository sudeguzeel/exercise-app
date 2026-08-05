import { formatCompletionDuration } from "@/features/workouts/workout-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

function getCompletionMessage(completion: WorkoutCompletion) {
  if (!completion.plannedDay) {
    return "Bugünkü antrenmanını tamamladın. Plan dışı bu çalışma da ilerlemene eklendi.";
  }
  if (completion.currentStreak > 1) {
    return `Bugünkü antrenmanını tamamladın. Serin ${completion.currentStreak} güne ulaştı.`;
  }
  if (completion.currentStreak === 1) {
    return "Bugünkü antrenmanını tamamladın. Yeni serinin ilk gününü başarıyla bitirdin.";
  }
  return "Bugünkü antrenmanını tamamladın. Sonucun ilerlemene eklendi.";
}

export default function WorkoutCompleteScreen() {
  const params = useLocalSearchParams<{
    workoutSessionId?: string | string[];
  }>();
  const workoutSessionId =
    singleParam(params.workoutSessionId)?.trim() ?? "";
  const [completion, setCompletion] = useState<
    WorkoutCompletion | null | undefined
  >(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    router.replace("/(main)");
  }, []);

  const loadCompletion = useCallback(async () => {
    if (!isValidWorkoutSessionId(workoutSessionId)) {
      setCompletion(null);
      setLoadError("Antrenman sonucu bağlantısı geçersiz.");
      return;
    }
    setCompletion(undefined);
    setLoadError(null);
    try {
      const result = await workoutRepository.getCompletion(workoutSessionId);
      setCompletion(result);
      if (!result) setLoadError("Tamamlanan antrenman kaydı bulunamadı.");
    } catch {
      setCompletion(null);
      setLoadError("Antrenman sonucu yüklenemedi.");
    }
  }, [workoutSessionId]);

  useEffect(() => {
    void loadCompletion();
  }, [loadCompletion]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        goHome();
        return true;
      },
    );
    return () => subscription.remove();
  }, [goHome]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      {completion === undefined && !loadError ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={MainColors.primary} size="large" />
          <Text style={styles.stateText}>Antrenman sonucu hazırlanıyor…</Text>
        </View>
      ) : completion ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconWrap}>
            <Ionicons name="star-outline" size={49} color={MainColors.primary} />
          </View>

          <Text style={styles.title}>Harika İş!</Text>
          <Text style={styles.description}>{getCompletionMessage(completion)}</Text>

          <View style={styles.summaryRow}>
            <SummaryCard
              label="SÜRE"
              value={formatCompletionDuration(completion.durationMs)}
            />
            <SummaryCard
              label="HAREKET"
              value={String(completion.completedExerciseCount)}
            />
            <SummaryCard label="SERİ" value={`${completion.currentStreak} gün`} />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "İlerlemem",
                  "İlerlemem ekranı henüz hazır değil. Antrenman verilerin kaydedildi.",
                )
              }
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>İlerlememi gör</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={goHome}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Ana sayfaya dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={MainColors.primary}
          />
          <Text style={styles.stateTitle}>Sonuç açılamadı</Text>
          <Text style={styles.stateText}>{loadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadCompletion()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Yeniden dene</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goHome}>
            <Text style={styles.homeLink}>Ana sayfaya dön</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      accessible
      style={styles.summaryCard}
    >
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 28,
    backgroundColor: "#EEF6D9",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 22,
    color: MainColors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  description: {
    maxWidth: 400,
    marginTop: 10,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  summaryRow: {
    width: "100%",
    marginTop: 28,
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 70,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    color: MainColors.mutedText,
    fontSize: 10,
    fontWeight: "700",
  },
  summaryValue: {
    width: "100%",
    marginTop: 5,
    color: MainColors.text,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  actions: { width: "100%", marginTop: 20, gap: 10 },
  primaryButton: {
    minHeight: 54,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: MainColors.primaryBright,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: MainColors.text,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: MainColors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: { opacity: 0.72 },
  centerState: {
    flex: 1,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateTitle: {
    color: MainColors.text,
    fontSize: 23,
    fontWeight: "900",
    textAlign: "center",
  },
  stateText: {
    maxWidth: 360,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  homeLink: { padding: 8, color: MainColors.primary, fontWeight: "800" },
});

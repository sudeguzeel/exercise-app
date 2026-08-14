import { formatCompletionDuration } from "@/features/workouts/workout-domain";
import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { MascotSpeechBubble } from "@/shared/components/mascot-speech-bubble";
import { WORKOUT_COMPLETE_MASCOT } from "@/shared/constants/mascot-assets";
import { MainColors } from "@/shared/constants/theme";
import { useThemedScreenStyles } from "@/shared/hooks/use-themed-screen-styles";
import { useAppTheme } from "@/providers/AppThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCompletionMessage(completion: WorkoutCompletion) {
  if (!completion.plannedDay) {
    return "Seçtiğin antrenmanı tamamladın. Plan dışı bu çalışma da ilerlemene eklendi.";
  }
  if (completion.currentStreak > 1) {
    return `Seçtiğin antrenmanı tamamladın. Serin ${completion.currentStreak} güne ulaştı.`;
  }
  if (completion.currentStreak === 1) {
    return "Seçtiğin antrenmanı tamamladın. Yeni serinin ilk gününü başarıyla bitirdin.";
  }
  return "Seçtiğin antrenmanı tamamladın. Sonucun ilerlemene eklendi.";
}

export default function WorkoutCompleteScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedScreenStyles(baseStyles);
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 430;
  const celebrationEntrance = useRef(new Animated.Value(0)).current;
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

  const goToProgress = useCallback(() => {
    router.replace("/(main)/progress");
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
    if (!completion) return;
    celebrationEntrance.setValue(0);
    Animated.sequence([
      Animated.timing(celebrationEntrance, {
        toValue: 1,
        duration: 340,
        easing: Easing.out(Easing.back(1.35)),
        useNativeDriver: true,
      }),
      Animated.timing(celebrationEntrance, {
        toValue: 2,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(celebrationEntrance, {
        toValue: 3,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [celebrationEntrance, completion]);

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
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Antrenman sonucu hazırlanıyor…</Text>
        </View>
      ) : completion ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.successHero,
              isCompactWidth && styles.successHeroCompact,
              {
                opacity: celebrationEntrance.interpolate({
                  inputRange: [0, 0.55, 3],
                  outputRange: [0, 1, 1],
                }),
                transform: [
                  {
                    translateY: celebrationEntrance.interpolate({
                      inputRange: [0, 1, 2, 3],
                      outputRange: [12, 0, -6, 0],
                    }),
                  },
                  {
                    scale: celebrationEntrance.interpolate({
                      inputRange: [0, 1, 2, 3],
                      outputRange: [0.88, 1, 1, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <MascotSpeechBubble
              message="Harika iş!"
              tailDirection="bottom-right"
              style={styles.successSpeechBubble}
            />
            <Image
              accessibilityLabel="Kutlama yapan FitRehber tavşan maskotu"
              contentFit="contain"
              source={WORKOUT_COMPLETE_MASCOT}
              style={[
                styles.successMascot,
                isCompactWidth && styles.successMascotCompact,
              ]}
            />
          </Animated.View>

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
          onPress={goToProgress}
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
            color={colors.primary}
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
  const styles = useThemedScreenStyles(baseStyles);
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

const baseStyles = StyleSheet.create({
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
  successHero: {
    position: "relative",
    width: 310,
    height: 210,
  },
  successHeroCompact: { width: 244, height: 172 },
  successSpeechBubble: {
    position: "absolute",
    top: 12,
    left: 8,
    width: 126,
    maxWidth: 126,
    zIndex: 2,
  },
  successMascot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 190,
    height: 190,
  },
  successMascotCompact: { width: 150, height: 150 },
  description: {
    maxWidth: 400,
    marginTop: 12,
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

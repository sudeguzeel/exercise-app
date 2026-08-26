import { buildHomeDashboard, type HomeDashboard } from "@/shared/lib/home-dashboard";
import { toDateKey } from "@/shared/lib/home-dashboard";
import { getHomeSourceData } from "@/shared/lib/services/homeService";
import { DataErrorState } from "@/shared/components/data-error-state";
import {
  getRaccoonMood,
  RaccoonMascot,
  type RaccoonMood,
} from "@/shared/components/raccoon-mascot";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import { useOnboarding, type TrainingDay } from "@/providers/OnboardingContext";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_CHART_VALUE = 20;
const CHART_HEIGHT = 120;

const MASCOT_MESSAGES: Record<RaccoonMood, readonly string[]> = {
  sleepy: [
    "Bugün sadece başla, gerisi gelir.",
    "Küçük bir adım da ilerlemedir.",
    "Hazır olman gerekmiyor, başlaman yeter.",
  ],
  tired: [
    "Yorulman normal. Devam etmen önemli.",
    "Biraz nefes al, sonra devam ederiz.",
    "Zorlanıyorsan gelişiyorsun demektir.",
  ],
  getting_used: [
    "Bak, alışmaya başladın!",
    "Ritmin oluşuyor, bunu hissediyorum.",
    "Her gün biraz daha güçlüsün.",
  ],
  motivated: [
    "Artık ritmi yakaladın.",
    "Kararlılığın yüzünden okunuyor!",
    "Bugün de kendin için buradasın.",
  ],
  focused: [
    "Kararlılığın fark yaratıyor.",
    "Odağını koru, sonuçlar geliyor.",
    "Bu artık bir alışkanlık oluyor.",
  ],
  fit: [
    "Değişim artık görünüyor!",
    "Emeğin güce dönüşüyor.",
    "İstikrar sana çok yakıştı.",
  ],
  athlete: [
    "Disiplin senin gücün oldu.",
    "Artık sadece çalışmıyor, gelişiyorsun.",
    "Bir sporcu gibi düşünüyorsun.",
  ],
  champion: [
    "100 gün! Bunu gerçekten sen başardın.",
    "Buraya şansla değil, emekle geldin.",
    "Şampiyonluk, devam etmeyi seçmektir.",
  ],
};

function getMascotMessage(streak: number) {
  const safeStreak = Number.isFinite(streak)
    ? Math.max(0, Math.floor(streak))
    : 0;
  const messages = MASCOT_MESSAGES[getRaccoonMood(safeStreak)];
  return messages[safeStreak % messages.length];
}

export default function HomeScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 430;
  const styles = useMemo(
    () => createStyles(colors, isDark, isCompactWidth),
    [colors, isDark, isCompactWidth],
  );
  const { trainingDays } = useOnboarding();
  const { isOffline } = useConnectivity();
  const scrollRef = useRef<ScrollView>(null);
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TrainingDay>(() => {
    const dayIndex = (new Date().getDay() + 6) % 7;
    const days: TrainingDay[] = [
      "monday", "tuesday", "wednesday", "thursday",
      "friday", "saturday", "sunday",
    ];
    return days[dayIndex];
  });

  const loadDashboard = useCallback(async () => {
    setLoadState("loading");
    try {
      const source = await getHomeSourceData();
      setDashboard(
        buildHomeDashboard(
          source.programs,
          source.completedRecords,
          source.exerciseLookup,
          source.categories,
        ),
      );
      setLoadState("success");
    } catch {
      setLoadState("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );
  useScrollToTop(scrollRef);

  const retryDashboard = useCallback(async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await loadDashboard();
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, loadDashboard]);

  const displayedTargetDays = useMemo(() => {
    if (!dashboard) return [];
    const today = toDateKey(new Date());
    const realTargets = new Map(dashboard.targetDays.map((day) => [day.id, day]));

    return dashboard.dailyTotals.map((day) => {
      const realTarget = realTargets.get(day.id);
      if (realTarget) {
        return realTarget;
      }

      const isOnboardingTarget = trainingDays.includes(day.id);
      if (!isOnboardingTarget) {
        return { ...day, status: "rest" as const };
      }

      const status =
        day.date > today
          ? ("upcoming" as const)
          : day.date < today
            ? ("missed" as const)
            : ("today" as const);
      return { ...day, status };
    });
  }, [dashboard, trainingDays]);

  const selectedDayProgram = dashboard?.programExercisesByDay[selectedDay] ?? [];
  const selectedDayDetails = displayedTargetDays.find(
    (day) => day.id === selectedDay,
  );
  const selectedDayLabel = selectedDayDetails?.label ?? t("home.dayFallback");
  if (loadState === "loading" && !dashboard && !isRetrying) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (loadState === "error" || isRetrying || !dashboard) {
    const variant = isOffline ? "offline" : "service";
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DataErrorState
          errorCode="FIT-SERVICE-HOME"
          onRetry={() => void retryDashboard()}
          onSecondaryAction={
            variant === "offline"
              ? dashboard
                ? () => setLoadState("success")
                : undefined
              : () => router.replace("/(main)")
          }
          secondaryActionDisabled={
            isRetrying || (variant === "offline" && !dashboard)
          }
          retrying={isRetrying}
          variant={variant}
        />
      </SafeAreaView>
    );
  }

  const mascotMessage = getMascotMessage(dashboard.streakDays);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.fixedProfileRow}>
        <Pressable
          accessibilityHint={t("home.openProfileHint")}
          accessibilityLabel={t("home.openProfileLabel")}
          accessibilityRole="button"
          onPress={() => router.push("/(main)/profile")}
          style={({ pressed }) => [
            styles.profileButton,
            pressed && styles.profileButtonPressed,
          ]}
        >
          <Ionicons name="person-outline" size={23} color={colors.text} />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View pointerEvents="none" style={styles.summaryDecorations}>
            <View style={[styles.summaryHill, styles.summaryHillBack]} />
            <View style={[styles.summaryHill, styles.summaryHillFront]} />
            <View style={[styles.summaryTree, styles.summaryTreeLeft]}>
              <View style={styles.summaryTreeTop} />
              <View style={styles.summaryTreeTrunk} />
            </View>
            <View style={[styles.summaryTree, styles.summaryTreeRight]}>
              <View style={styles.summaryTreeTop} />
              <View style={styles.summaryTreeTrunk} />
            </View>
            <View style={[styles.summaryLeaf, styles.summaryLeafOne]} />
            <View style={[styles.summaryLeaf, styles.summaryLeafTwo]} />
            <View style={[styles.summaryLeaf, styles.summaryLeafThree]} />
          </View>
          <View style={styles.mascotSpeechBubble}>
            <View pointerEvents="none" style={styles.mascotSpeechGlowOne} />
            <View pointerEvents="none" style={styles.mascotSpeechGlowTwo} />
            <Text numberOfLines={3} style={styles.mascotSpeechText}>
              {mascotMessage}
            </Text>
            <View style={styles.mascotSpeechTail} />
          </View>
          <View style={styles.summaryContent}>
            <Text
              style={styles.summaryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {t("home.weeklyTotalLabel")}
            </Text>
            <Text style={styles.summaryValue}>{dashboard.weeklyTotal}</Text>
          </View>
          <RaccoonMascot
            size={isCompactWidth ? 142 : 168}
            streak={dashboard.streakDays}
            style={styles.summaryMascot}
          />
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              {t("home.streakDays", { count: dashboard.streakDays })}
            </Text>
          </View>
        </View>

        <SectionTitle>{t("home.bodyAreasTitle")}</SectionTitle>
        {dashboard.categoryTotals.length > 0 ? (
          <View style={styles.bodyAreasCard}>
            {dashboard.categoryTotals.map((area) => (
              <View key={area.id} style={styles.bodyAreaItem}>
                <View style={styles.bodyAreaIcon}>
                  <Ionicons name={area.icon} size={22} color={colors.text} />
                </View>
                <Text style={styles.bodyAreaLabel}>{area.name}</Text>
                <Text style={styles.bodyAreaValue}>{area.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyCard text={t("home.noBodyAreaData")} />
        )}

        <SectionTitle>{t("home.weeklyGoalTitle")}</SectionTitle>
        {displayedTargetDays.length > 0 ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.targetDaysRow}
          showsHorizontalScrollIndicator={false}
        >
            {displayedTargetDays.map((day) => (
              <Pressable
                key={day.id}
                onPress={() => setSelectedDay(day.id)}
                style={[
                  styles.weekDayCard,
                  day.status === "completed" && styles.targetDayCompleted,
                  day.status === "missed" && styles.targetDayMissed,
                  day.id === selectedDay && styles.targetDaySelected,
                ]}
              >
                <Text
                  style={[
                    styles.targetDayLabel,
                    day.status === "completed" &&
                      styles.targetDayCompletedText,
                    day.status === "missed" && styles.targetDayMissedText,
                  ]}
                >
                  {day.label}
                </Text>
                {day.status === "completed" ? (
                  <Ionicons name="checkmark" size={22} color={colors.onPrimary} />
                ) : day.status === "missed" ? (
                  <Ionicons name="close" size={22} color={colors.inverseText} />
                ) : day.status === "today" ? (
                  <Text style={styles.todayText}>{t("home.today")}</Text>
                ) : day.status === "rest" ? (
                  <Text style={styles.pendingText}>{t("home.rest")}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyTargetCard}>
            <Text style={styles.emptyTargetText}>
              {t("home.noProgramMessage")}
            </Text>
          </View>
        )}

        <SectionTitle>{t("home.dayProgramTitle", { day: selectedDayLabel })}</SectionTitle>
        <View style={styles.programCard}>
          {selectedDayProgram.length === 0 ? (
            <View style={styles.createProgramState}>
              <Text style={styles.restDayText}>{t("home.noProgramForDay")}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/exercise",
                    params: { initialTrainingDay: selectedDay },
                  })
                }
                style={({ pressed }) => [
                  styles.createProgramButton,
                  pressed && styles.exerciseRowPressed,
                ]}
              >
                <Ionicons name="add-circle-outline" size={21} color={colors.onPrimary} />
                <Text style={styles.createProgramButtonText}>{t("home.createProgram")}</Text>
              </Pressable>
            </View>
          ) : (
            selectedDayProgram.map((plannedExercise, index) => (
              <Pressable
                key={plannedExercise.id}
                onPress={() =>
                  router.push({
                    pathname: "/(main)/program",
                    params: {
                      selectedDate: selectedDayDetails?.date,
                      activeProgramId: plannedExercise.programId,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.exerciseRow,
                  index < selectedDayProgram.length - 1 &&
                    styles.exerciseRowDivider,
                  pressed && styles.exerciseRowPressed,
                ]}
              >
                <Ionicons name={plannedExercise.icon} size={22} color={colors.primary} />
                <View style={styles.exerciseTextColumn}>
                  <Text style={styles.exerciseName}>
                    {plannedExercise.exerciseName}
                  </Text>
                  <Text style={styles.exerciseProgramName}>
                    {plannedExercise.programName}
                  </Text>
                </View>
                <Text style={styles.exerciseSets}>
                  {plannedExercise.sets}×{plannedExercise.reps}
                </Text>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
              </Pressable>
            ))
          )}
        </View>

        <SectionTitle>{t("home.weeklyChartTitle")}</SectionTitle>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            <View style={styles.yAxis}>
              <View style={styles.yAxisPlot}>
                {[20, 15, 10, 5, 0].map((tick) => (
                  <Text
                    key={tick}
                    style={[
                      styles.gridLabel,
                      { bottom: (tick / MAX_CHART_VALUE) * CHART_HEIGHT },
                    ]}
                  >
                    {tick}
                  </Text>
                ))}
              </View>
              <View style={styles.yAxisLabelSpacer} />
            </View>

            <View style={styles.plotColumn}>
              <View style={styles.plotArea}>
                {[20, 15, 10, 5, 0].map((tick) => (
                  <View
                    key={tick}
                    style={[
                      styles.gridLine,
                      { bottom: (tick / MAX_CHART_VALUE) * CHART_HEIGHT },
                    ]}
                  >
                    <View style={styles.gridRule} />
                  </View>
                ))}

                <View style={styles.barsRow}>
                  {dashboard.dailyTotals.map((day) => {
                    const barHeight =
                      (day.value / MAX_CHART_VALUE) * CHART_HEIGHT;

                    return (
                      <View key={day.id} style={styles.barColumn}>
                        <Text
                          style={[
                            styles.barValue,
                            { bottom: Math.max(barHeight, 2) + 4 },
                          ]}
                        >
                          {day.value}
                        </Text>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(barHeight, 2) },
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.labelsRow}>
                {dashboard.dailyTotals.map((day) => (
                  <View key={day.id} style={styles.labelColumn}>
                    <Text style={styles.barLabel}>{day.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  const { colors } = useAppTheme();
  return <Text style={[sectionTitleBase, { color: colors.textSecondary }]}>{children}</Text>;
}

function EmptyCard({ text }: { text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[emptyCardBase, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <Text style={[emptyTextBase, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const sectionTitleBase = { marginTop: 27, marginBottom: 12, fontSize: 17, fontWeight: "800" as const };
const emptyCardBase = { padding: 20, borderWidth: 1, borderRadius: 18 };
const emptyTextBase = { fontSize: 14, textAlign: "center" as const };

const createStyles = (colors: AppThemeColors, isDark: boolean, isCompactWidth: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  fixedProfileRow: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 16,
    minHeight: 64,
    alignItems: "flex-end",
    justifyContent: "center",
    backgroundColor: colors.background,
    zIndex: 10,
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  profileButtonPressed: {
    opacity: 0.7,
  },
  summaryCard: {
    minHeight: isCompactWidth ? 218 : 226,
    padding: 24,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: isDark ? colors.surfaceElevated : colors.inverseSurface,
    overflow: "hidden",
  },
  summaryDecorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  summaryHill: {
    position: "absolute",
    bottom: -54,
    height: 92,
    borderRadius: 999,
    backgroundColor: isDark ? "#17331F" : "#DDEDD0",
    opacity: isDark ? 0.5 : 0.72,
  },
  summaryHillBack: {
    left: "17%",
    width: "62%",
    transform: [{ rotate: "-4deg" }],
  },
  summaryHillFront: {
    right: "-8%",
    width: "58%",
    bottom: -63,
    backgroundColor: isDark ? "#24452A" : "#ECF5E4",
    transform: [{ rotate: "5deg" }],
  },
  summaryTree: {
    position: "absolute",
    bottom: 13,
    width: 20,
    height: 38,
    alignItems: "center",
    opacity: isDark ? 0.36 : 0.48,
  },
  summaryTreeLeft: { left: "31%" },
  summaryTreeRight: { right: "22%", transform: [{ scale: 0.78 }] },
  summaryTreeTop: {
    width: 19,
    height: 26,
    borderRadius: 10,
    backgroundColor: isDark ? "#426A33" : "#A8CF87",
  },
  summaryTreeTrunk: {
    width: 3,
    height: 13,
    backgroundColor: isDark ? "#466044" : "#A6B68E",
  },
  summaryLeaf: {
    position: "absolute",
    width: 11,
    height: 5,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: isDark ? 0.28 : 0.34,
  },
  summaryLeafOne: { left: "43%", top: 34, transform: [{ rotate: "-24deg" }] },
  summaryLeafTwo: { left: "57%", top: 55, transform: [{ rotate: "18deg" }] },
  summaryLeafThree: { right: "30%", top: 27, transform: [{ rotate: "-12deg" }] },
  summaryContent: {
    position: "absolute",
    left: 24,
    bottom: 18,
    flex: 1,
    minWidth: 0,
    maxWidth: "42%",
    alignSelf: "flex-start",
    zIndex: 2,
  },
  summaryMascot: {
    position: "absolute",
    right: isCompactWidth ? -4 : 6,
    top: isCompactWidth ? 38 : 30,
    zIndex: 2,
  },
  mascotSpeechBubble: {
    position: "absolute",
    left: 20,
    top: 18,
    width: isCompactWidth ? "51%" : "48%",
    minHeight: 54,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: isDark ? "rgba(126, 220, 52, 0.68)" : "rgba(76, 133, 48, 0.48)",
    borderRadius: 18,
    justifyContent: "center",
    backgroundColor: isDark ? "rgba(18, 27, 20, 0.97)" : "rgba(241, 247, 236, 0.96)",
    shadowColor: isDark ? colors.primary : "#426D30",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.16 : 0.1,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 4,
  },
  mascotSpeechGlowOne: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 96,
    height: 25,
    borderRadius: 999,
    backgroundColor: isDark ? "rgba(49, 103, 52, 0.3)" : "rgba(128, 175, 99, 0.2)",
    transform: [{ rotate: "-5deg" }],
  },
  mascotSpeechGlowTwo: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 108,
    height: 29,
    borderRadius: 999,
    backgroundColor: isDark ? "rgba(36, 82, 43, 0.34)" : "rgba(166, 199, 137, 0.2)",
    transform: [{ rotate: "6deg" }],
  },
  mascotSpeechText: {
    zIndex: 1,
    color: isDark ? "#F3F8EF" : "#1D321A",
    fontSize: isCompactWidth ? 11 : 12,
    lineHeight: isCompactWidth ? 15 : 17,
    fontWeight: "700",
  },
  mascotSpeechTail: {
    position: "absolute",
    right: -9,
    bottom: 13,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 10,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: isDark ? "rgba(18, 27, 20, 0.97)" : "rgba(241, 247, 236, 0.96)",
  },
  summaryLabel: {
    flexShrink: 1,
    marginRight: 8,
    color: isDark ? colors.textSecondary : colors.inverseText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  summaryValue: {
    marginTop: 10,
    color: isDark ? colors.text : colors.inverseText,
    fontSize: 58,
    lineHeight: 64,
    fontWeight: "900",
  },
  streakBadge: {
    position: "absolute",
    right: isCompactWidth ? 10 : 16,
    bottom: isCompactWidth ? 10 : 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    zIndex: 2,
  },
  streakText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 27,
    marginBottom: 12,
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: "800",
  },
  bodyAreasCard: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surface,
  },
  bodyAreaItem: {
    width: "50%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  bodyAreaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  bodyAreaLabel: {
    flex: 1,
    marginLeft: 8,
    color: colors.text,
    fontSize: 12,
    lineHeight: 15,
  },
  bodyAreaValue: {
    marginLeft: 5,
    marginRight: 4,
    color: colors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  targetDaysRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 6,
  },
  weekDayCard: {
    width: 112,
    minHeight: 82,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  targetDayCompleted: {
    backgroundColor: colors.primary,
  },
  targetDayMissed: {
    borderColor: colors.error,
    backgroundColor: colors.error,
  },
  targetDaySelected: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  targetDayLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  targetDayCompletedText: {
    color: colors.onPrimary,
  },
  targetDayMissedText: {
    color: colors.inverseText,
  },
  todayText: {
    marginTop: 5,
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  pendingText: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTargetCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  emptyTargetText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  chartCard: {
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  chart: {
    height: 166,
    flexDirection: "row",
  },
  yAxis: {
    width: 28,
    flexShrink: 0,
  },
  yAxisPlot: {
    height: CHART_HEIGHT + 18,
    position: "relative",
  },
  yAxisLabelSpacer: {
    height: 28,
  },
  plotColumn: {
    flex: 1,
    minWidth: 0,
  },
  plotArea: {
    height: CHART_HEIGHT + 18,
    position: "relative",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  gridLabel: {
    position: "absolute",
    right: 5,
    transform: [{ translateY: 7 }],
    color: colors.textSecondary,
    fontSize: 11,
  },
  gridRule: {
    width: "100%",
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderSubtle,
  },
  barsRow: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: CHART_HEIGHT,
    flexDirection: "row",
  },
  barColumn: {
    flex: 1,
    height: CHART_HEIGHT,
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  labelsRow: {
    height: 28,
    flexDirection: "row",
  },
  labelColumn: {
    flex: 1,
    alignItems: "center",
  },
  barValue: {
    position: "absolute",
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  bar: {
    width: 25,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: colors.primary,
  },
  barLabel: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  programCard: {
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  exerciseRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  exerciseRowPressed: {
    opacity: 0.65,
  },
  restDayText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  createProgramState: {
    paddingVertical: 22,
    alignItems: "center",
  },
  createProgramButton: {
    minHeight: 48,
    marginTop: 14,
    paddingHorizontal: 22,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
  },
  createProgramButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "900",
  },
  exerciseTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseProgramName: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  exerciseSets: {
    marginHorizontal: 4,
    color: colors.primary,
    fontSize: 18,
    fontWeight: "800",
  },
});

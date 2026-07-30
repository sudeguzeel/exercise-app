import { useOnboarding } from "@/context/OnboardingContext";
import { buildHomeDashboard } from "@/shared/lib/home-dashboard";
import { getHomeSourceData } from "@/shared/lib/services/homeService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#62B900";
const DARK = "#111516";
const TEXT = "#171A18";
const MUTED = "#747774";
const BORDER = "#E1E3DF";
const MAX_CHART_VALUE = 20;
const CHART_HEIGHT = 150;

export default function HomeScreen() {
  const { trainingDays } = useOnboarding();
  const dashboard = useMemo(
    () =>
      buildHomeDashboard(
        getHomeSourceData(),
        trainingDays,
      ),
    [trainingDays],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileRow}>
          <View style={styles.profileButton}>
            <Ionicons name="person-outline" size={23} color={TEXT} />
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryContent}>
            <Text
              style={styles.summaryLabel}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              HAFTALIK TOPLAM HAREKET
            </Text>
            <Text style={styles.summaryValue}>{dashboard.weeklyTotal}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              🔥 {dashboard.streakDays} günlük seri
            </Text>
          </View>
        </View>

        <SectionTitle>VÜCUT BÖLGELERİ (HAFTALIK)</SectionTitle>
        <View style={styles.bodyAreasCard}>
          {dashboard.categoryTotals.map((area) => (
            <View key={area.id} style={styles.bodyAreaItem}>
              <View style={styles.bodyAreaIcon}>
                <Ionicons name={area.icon} size={27} color={TEXT} />
              </View>
              <Text style={styles.bodyAreaLabel}>{area.name}</Text>
              <Text style={styles.bodyAreaValue}>{area.value}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>BU HAFTAKİ HEDEF</SectionTitle>
        {dashboard.targetDays.length > 0 ? (
          <View style={styles.targetDaysRow}>
            {dashboard.targetDays.map((day) => (
                <View
                  key={day.id}
                  style={[
                    styles.targetDay,
                    day.status === "completed" && styles.targetDayCompleted,
                    day.status === "missed" && styles.targetDayMissed,
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
                    <Ionicons name="checkmark" size={22} color="#111111" />
                  ) : day.status === "missed" ? (
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  ) : day.status === "today" ? (
                    <Text style={styles.todayText}>Bugün</Text>
                  ) : (
                    <Text style={styles.pendingText}>
                      {day.status === "rest" ? "Dinlenme" : "Bekliyor"}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        ) : (
          <View style={styles.emptyTargetCard}>
            <Text style={styles.emptyTargetText}>
              Henüz bir antrenman günü seçilmedi.
            </Text>
          </View>
        )}

        <SectionTitle>HAFTALIK ANTRENMAN GRAFİĞİ</SectionTitle>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {[20, 15, 10, 5, 0].map((tick) => (
              <View
                key={tick}
                style={[
                  styles.gridLine,
                  { bottom: (tick / MAX_CHART_VALUE) * CHART_HEIGHT },
                ]}
              >
                <Text style={styles.gridLabel}>{tick}</Text>
                <View style={styles.gridRule} />
              </View>
            ))}

            <View style={styles.barsRow}>
              {dashboard.dailyTotals.map((day) => {
                const barHeight =
                  (day.value / MAX_CHART_VALUE) * CHART_HEIGHT;

                return (
                  <View key={day.id} style={styles.barColumn}>
                    <View style={styles.barValueArea}>
                      <Text style={styles.barValue}>{day.value}</Text>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(barHeight, 2) },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{day.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <SectionTitle>BUGÜNKÜ PROGRAM</SectionTitle>
        <View style={styles.programCard}>
          {dashboard.isRestDay ? (
            <Text style={styles.restDayText}>Bugün dinlenme günü</Text>
          ) : (
            dashboard.todayProgram.map((plannedExercise, index) => (
              <Pressable
                key={plannedExercise.exercise.id}
                onPress={() =>
                  router.push({
                    pathname: "/exercise-detail",
                    params: { exerciseId: plannedExercise.exercise.id },
                  })
                }
                style={({ pressed }) => [
                  styles.exerciseRow,
                  index < dashboard.todayProgram.length - 1 &&
                    styles.exerciseRowDivider,
                  pressed && styles.exerciseRowPressed,
                ]}
              >
                <Text style={styles.exerciseName}>
                  {plannedExercise.exercise.name}
                </Text>
                <Text style={styles.exerciseSets}>
                  {plannedExercise.sets}×{plannedExercise.reps}
                </Text>
                <Ionicons name="chevron-forward" size={22} color="#777A78" />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "rgba(116, 168, 0, 0.12)",
  },
  title: {
    color: "#14171A",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 7,
    marginBottom: 32,
    color: "#6C716C",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  signOutButton: {
    height: 50,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "#95D600",
    shadowColor: "#95D600",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutButtonText: {
    color: "#101214",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  profileRow: {
    minHeight: 64,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  summaryCard: {
    minHeight: 168,
    padding: 24,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DARK,
  },
  summaryContent: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    flexShrink: 1,
    marginRight: 8,
    color: "#BFC2C0",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  summaryValue: {
    marginTop: 10,
    color: "#FFFFFF",
    fontSize: 58,
    lineHeight: 64,
    fontWeight: "900",
  },
  streakBadge: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: "#263709",
  },
  streakText: {
    color: "#80D000",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 27,
    marginBottom: 12,
    color: MUTED,
    fontSize: 17,
    fontWeight: "800",
  },
  bodyAreasCard: {
    paddingHorizontal: 8,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
  },
  bodyAreaItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 20,
  },
  bodyAreaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F3EA",
  },
  bodyAreaLabel: {
    minHeight: 34,
    marginTop: 7,
    color: TEXT,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  bodyAreaValue: {
    color: GREEN,
    fontSize: 18,
    fontWeight: "800",
  },
  targetDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  targetDay: {
    minWidth: 96,
    flexGrow: 1,
    minHeight: 82,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  targetDayCompleted: {
    backgroundColor: "#72C600",
  },
  targetDayMissed: {
    borderColor: "#D94A4A",
    backgroundColor: "#D94A4A",
  },
  targetDayLabel: {
    color: MUTED,
    fontSize: 15,
    fontWeight: "700",
  },
  targetDayCompletedText: {
    color: "#111111",
  },
  targetDayMissedText: {
    color: "#FFFFFF",
  },
  todayText: {
    marginTop: 5,
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  pendingText: {
    marginTop: 5,
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyTargetCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  emptyTargetText: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
  },
  chartCard: {
    paddingHorizontal: 10,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  chart: {
    height: 205,
    position: "relative",
    paddingLeft: 30,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  gridLabel: {
    width: 28,
    color: MUTED,
    fontSize: 11,
  },
  gridRule: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E1E3DF",
  },
  barsRow: {
    height: CHART_HEIGHT + 28,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barValueArea: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValue: {
    marginBottom: 4,
    color: TEXT,
    fontSize: 12,
    fontWeight: "700",
  },
  bar: {
    width: 25,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: GREEN,
  },
  barLabel: {
    marginTop: 8,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },
  programCard: {
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  exerciseRowPressed: {
    opacity: 0.65,
  },
  restDayText: {
    paddingVertical: 26,
    color: MUTED,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  exerciseName: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
  },
  exerciseSets: {
    marginHorizontal: 12,
    color: GREEN,
    fontSize: 18,
    fontWeight: "800",
  },
});

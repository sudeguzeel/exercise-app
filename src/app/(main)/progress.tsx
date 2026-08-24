import {
  EmptyContent,
  HistoryCard,
  PeriodSelector,
  SectionTitle,
  StatCard,
  WeightSummaryRow,
} from "@/features/progress/components/progress-components";
import {
  calculatePercentageChange,
  calculateWorkoutStreaks,
  formatDecimal,
  formatSignedPercentageChange,
  parseBodyRatio,
  parsePositiveWeight,
  validateBodyMeasurement,
} from "@/features/progress/progress-domain";
import {
  saveBodyMeasurement,
  saveBodyTargets,
} from "@/features/progress/progress-storage";
import { loadProgressDashboard } from "@/features/progress/progress-service";
import type {
  ProgressDashboard,
  ProgressPeriod,
} from "@/features/progress/types";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { DataErrorState } from "@/shared/components/data-error-state";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MeasurementFields = {
  weight: string;
  bodyFat: string;
  muscle: string;
};

type TargetField = "all" | "weight" | "bodyFat" | "muscle";

const EMPTY_MEASUREMENT: MeasurementFields = {
  weight: "",
  bodyFat: "",
  muscle: "",
};

const STEP_DAY_LABELS = ["P", "S", "Ç", "P", "C", "C", "P"];
const STEP_DAY_NAMES = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];
const STEP_CHART_VALUES = [4820, 6350, 5210, 6842, 7480, 5930, 6910];

export default function ProgressScreen() {
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isCompactWidth = windowWidth < 430;
  const styles = useMemo(
    () => createStyles(colors, isCompactWidth),
    [colors, isCompactWidth],
  );
  const listRef = useRef<FlatList<WorkoutCompletion>>(null);
  const [period, setPeriod] = useState<ProgressPeriod>("week");
  const [dashboard, setDashboard] = useState<ProgressDashboard>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [measurement, setMeasurement] =
    useState<MeasurementFields>(EMPTY_MEASUREMENT);
  const [measurementErrors, setMeasurementErrors] = useState<
    Partial<Record<keyof MeasurementFields, string>>
  >({});
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetField, setTargetField] = useState<TargetField>("weight");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetBodyFat, setTargetBodyFat] = useState("");
  const [targetMuscle, setTargetMuscle] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [savingTarget, setSavingTarget] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setLoadError(null);
      try {
        const result = await loadProgressDashboard(period);
        setDashboard(result);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "İlerleme bilgileri yüklenemedi.",
        );
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [period],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!dashboard) return;
    setMeasurement((current) => {
      if (current.weight || current.bodyFat || current.muscle) return current;
      return {
        weight:
          dashboard.bodyProgress.currentWeightKg === null
            ? ""
            : String(dashboard.bodyProgress.currentWeightKg),
        bodyFat:
          dashboard.bodyProgress.bodyFatPercentage === null
            ? ""
            : String(dashboard.bodyProgress.bodyFatPercentage),
        muscle:
          dashboard.bodyProgress.musclePercentage === null
            ? ""
            : String(dashboard.bodyProgress.musclePercentage),
      };
    });
  }, [dashboard]);

  const openWeights = useCallback(() => {
    router.push("/exercise-weights" as never);
  }, []);

  const openTargetModal = useCallback((field: TargetField) => {
    setTargetField(field);
    setTargetWeight(
      dashboard?.bodyProgress.targetWeightKg === null ||
        dashboard?.bodyProgress.targetWeightKg === undefined
        ? ""
        : String(dashboard.bodyProgress.targetWeightKg),
    );
    setTargetBodyFat(
      dashboard?.bodyProgress.targetBodyFatPercentage === null ||
        dashboard?.bodyProgress.targetBodyFatPercentage === undefined
        ? ""
        : String(dashboard.bodyProgress.targetBodyFatPercentage),
    );
    setTargetMuscle(
      dashboard?.bodyProgress.targetMusclePercentage === null ||
        dashboard?.bodyProgress.targetMusclePercentage === undefined
        ? ""
        : String(dashboard.bodyProgress.targetMusclePercentage),
    );
    setTargetError(null);
    setTargetModalVisible(true);
  }, [dashboard]);

  const submitTarget = useCallback(async () => {
    if (savingTarget) return;
    const parsedWeight = parsePositiveWeight(targetWeight);
    const parsedBodyFat = parseBodyRatio(targetBodyFat);
    const parsedMuscle = parseBodyRatio(targetMuscle);
    if (
      ((targetField === "all" || targetField === "weight") && parsedWeight === null) ||
      ((targetField === "all" || targetField === "bodyFat") && parsedBodyFat === null) ||
      ((targetField === "all" || targetField === "muscle") && parsedMuscle === null)
    ) {
      setTargetError(
        targetField === "all"
          ? "Kilo 0–500; yağ ve kas hedefleri 0–100 arasında olmalıdır."
          : targetField === "weight"
          ? "Kilo hedefi 0–500 arasında olmalıdır."
          : targetField === "bodyFat"
            ? "Yağ hedefi 0–100 arasında olmalıdır."
            : targetField === "muscle"
              ? "Kas hedefi 0–100 arasında olmalıdır."
              : "Geçerli bir hedef girin.",
      );
      return;
    }
    setSavingTarget(true);
    setTargetError(null);
    try {
      await saveBodyTargets({
        targetWeightKg:
          targetField === "all" || targetField === "weight" ? parsedWeight! : undefined,
        bodyFatPercentage:
          targetField === "all" || targetField === "bodyFat" ? parsedBodyFat! : undefined,
        musclePercentage:
          targetField === "all" || targetField === "muscle" ? parsedMuscle! : undefined,
      });
      setTargetModalVisible(false);
      await load(true);
    } catch (error) {
      setTargetError(
        error instanceof Error ? error.message : "Hedef kilo kaydedilemedi.",
      );
    } finally {
      setSavingTarget(false);
    }
  }, [load, savingTarget, targetBodyFat, targetField, targetMuscle, targetWeight]);

  const submitMeasurement = useCallback(async () => {
    if (savingMeasurement) return;
    const validation = validateBodyMeasurement(measurement);
    if (!validation.success) {
      setMeasurementErrors(validation.errors);
      return;
    }
    setMeasurementErrors({});
    setMeasurementError(null);
    setSavingMeasurement(true);
    try {
      await saveBodyMeasurement(validation.values);
      setMeasurement(EMPTY_MEASUREMENT);
      await load(true);
    } catch (error) {
      setMeasurementError(
        error instanceof Error ? error.message : "Ölçümler kaydedilemedi.",
      );
    } finally {
      setSavingMeasurement(false);
    }
  }, [load, measurement, savingMeasurement]);

  if (!dashboard && !loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>İlerleme bilgilerin hazırlanıyor…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dashboard || loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DataErrorState
          description={loadError ?? undefined}
          onRetry={() => void load()}
          presentation="fullscreen"
          variant="service"
        />
      </SafeAreaView>
    );
  }

  const body = dashboard.bodyProgress;
  const bodyFatChange = formatSignedPercentageChange(
    calculatePercentageChange(body.bodyFatPercentage, body.previousBodyFatPercentage),
  );
  const muscleChange = formatSignedPercentageChange(
    calculatePercentageChange(body.musclePercentage, body.previousMusclePercentage),
  );
  const activeDayCount = new Set(
    dashboard.history.map((completion) => completion.completedDate),
  ).size;
  const remainingActiveDays = Math.max(
    0,
    dashboard.periodTargetDayCount - activeDayCount,
  );
  const activeMonthCount = new Set(
    dashboard.history.map((completion) => completion.completedDate.slice(0, 7)),
  ).size;
  const periodLongestStreak = calculateWorkoutStreaks(
    dashboard.history,
  ).longestStreak;
  const elapsedWeekCount = Math.max(1, Math.ceil(new Date().getDate() / 7));
  const monthlyWeeklyAverage =
    dashboard.periodCompletedCount / elapsedWeekCount;

  const header = (
    <View style={styles.headerContent}>
      <Text style={styles.title}>İlerlemen</Text>
      <PeriodSelector onChange={setPeriod} value={period} />

      <View style={styles.statsRow}>
        <StatCard
          detail={
            period === "week"
              ? "bu hafta"
              : period === "month"
                ? "bu ay"
                : "bu yıl"
          }
          label="ANTRENMAN"
          value={String(dashboard.periodCompletedCount)}
        />
        {period === "year" ? (
          <StatCard
            detail="12 ay içinde"
            label="AKTİF AY"
            value={`${activeMonthCount}/12`}
          />
        ) : (
          <StatCard
            detail={
              period === "week" && dashboard.periodTargetDayCount > 0
                ? remainingActiveDays > 0
                  ? `hedefe ${remainingActiveDays} gün kaldı`
                  : "hedef tamamlandı"
                : period === "week"
                  ? "bu hafta"
                  : "bu ay"
            }
            label="AKTİF GÜN"
            value={`${activeDayCount} gün`}
          />
        )}
        {period === "week" ? (
          <StatCard
            detail={dashboard.currentStreak > 0 ? "Seriyi koru" : "Bugün başlat"}
            highlight
            label="SERİ"
            value={`${dashboard.currentStreak} gün`}
          />
        ) : period === "month" ? (
          <StatCard
            detail="antrenman / hafta"
            label="HAFTALIK ORT."
            value={formatDecimal(monthlyWeeklyAverage)}
          />
        ) : (
          <StatCard
            detail="bu yıl"
            highlight
            label="EN UZUN SERİ"
            value={`${periodLongestStreak} gün`}
          />
        )}
      </View>

      <View style={styles.progressCards}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={openWeights}
          style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
        >
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Hareket Ağırlıkların</Text>
          </View>
          <View style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </View>
        </Pressable>
        {dashboard.exerciseWeights.length > 0 ? (
          <>
            {dashboard.exerciseWeights.slice(0, 2).map((item) => (
              <WeightSummaryRow item={item} key={item.programExerciseId} />
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={openWeights}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Tüm hareketleri gör</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </>
        ) : (
          <>
            <EmptyContent
              icon="barbell-outline"
              title="Henüz çalışma kilosu yok"
            />
            <Pressable onPress={openWeights} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Hareketleri aç</Text>
            </Pressable>
          </>
        )}
      </View>

      {period === "week" ? <StepsChartCard /> : null}

      <View style={styles.card}>
        <View style={styles.bodyHeader}>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Vücut İlerlemen</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => openTargetModal("all")}
            style={({ pressed }) => [styles.bodyTargetButton, pressed && styles.pressed]}
          >
            <Ionicons color={colors.primary} name="flag-outline" size={13} />
            <Text style={styles.bodyTargetButtonText}>Hedef</Text>
          </Pressable>
        </View>
        <View style={styles.bodySummary}>
          <View style={styles.targetCardsRow}>
            <ProgressTargetCard
              current={body.currentWeightKg}
              icon="scale-outline"
              label="KİLO"
              onPress={() => openTargetModal("weight")}
              target={body.targetWeightKg}
              unit="kg"
            />
            <ProgressTargetCard
              change={bodyFatChange}
              current={body.bodyFatPercentage}
              icon="water-outline"
              label="YAĞ"
              onPress={() => openTargetModal("bodyFat")}
              target={body.targetBodyFatPercentage}
            />
            <ProgressTargetCard
              change={muscleChange}
              current={body.musclePercentage}
              icon="fitness-outline"
              label="KAS"
              onPress={() => openTargetModal("muscle")}
              target={body.targetMusclePercentage}
            />
          </View>
        </View>

        <View style={styles.measurementSection}>
          <Text style={styles.measurementTitle}>Yeni ölçüm ekle</Text>
          <View style={styles.inputRow}>
            <MeasurementInput
              error={measurementErrors.weight}
              label="KİLO"
              onChangeText={(weight) => setMeasurement((current) => ({ ...current, weight }))}
              suffix="kg"
              value={measurement.weight}
            />
            <MeasurementInput
              error={measurementErrors.bodyFat}
              label="YAĞ"
              onChangeText={(bodyFat) => setMeasurement((current) => ({ ...current, bodyFat }))}
              value={measurement.bodyFat}
            />
            <MeasurementInput
              error={measurementErrors.muscle}
              label="KAS"
              onChangeText={(muscle) => setMeasurement((current) => ({ ...current, muscle }))}
              value={measurement.muscle}
            />
          </View>
          {measurementError ? <Text style={styles.formError}>{measurementError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: savingMeasurement, disabled: savingMeasurement }}
            disabled={savingMeasurement}
            onPress={() => void submitMeasurement()}
            style={[styles.primaryButton, savingMeasurement && styles.disabled]}
          >
            {savingMeasurement ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.primaryButtonText}>Ölçümlerimi kaydet</Text>
            )}
          </Pressable>
        </View>
      </View>
      </View>

      <SectionTitle action="Tümünü gör" onAction={() => listRef.current?.scrollToEnd()}>
        GEÇMİŞ
      </SectionTitle>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <FlatList
          ListEmptyComponent={
            <View style={styles.card}>
              <EmptyContent
                description="Seçili dönemde tamamlanmış bir antrenman bulunmuyor."
                icon="time-outline"
                title="Henüz tamamlanmış antrenman yok"
              />
            </View>
          }
          ListFooterComponent={<View style={styles.footerSpace} />}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          data={dashboard.history}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ref={listRef}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <HistoryCard
                completion={item}
                onPress={() =>
                  router.push({
                    pathname: "/workout-detail" as never,
                    params: { workoutSessionId: item.workoutSessionId },
                  })
                }
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => !savingTarget && setTargetModalVisible(false)}
        transparent
        visible={targetModalVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {targetField === "weight"
                ? "Kilo hedefini değiştir"
                : targetField === "bodyFat"
                  ? "Yağ hedefini değiştir"
                  : targetField === "muscle"
                    ? "Kas hedefini değiştir"
                    : "Vücut hedeflerini değiştir"}
            </Text>
            {targetField === "all" || targetField === "weight" ? <>
              <Text style={styles.modalInputLabel}>HEDEF KİLO (KG)</Text>
              <TextInput
              accessibilityLabel="Hedef kilo"
              editable={!savingTarget}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={setTargetWeight}
              placeholder="Örn. 70"
              placeholderTextColor={colors.placeholder}
              style={[styles.modalInput, targetError && styles.inputError]}
              value={targetWeight}
              />
            </> : null}
            {targetField === "all" || targetField === "bodyFat" ? <>
              <Text style={styles.modalInputLabel}>HEDEF YAĞ ORANI</Text>
              <TextInput
              accessibilityLabel="Hedef yağ oranı"
              editable={!savingTarget}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={setTargetBodyFat}
              placeholder="Örn. 18"
              placeholderTextColor={colors.placeholder}
              style={[styles.modalInput, targetError && styles.inputError]}
              value={targetBodyFat}
              />
            </> : null}
            {targetField === "all" || targetField === "muscle" ? <>
              <Text style={styles.modalInputLabel}>HEDEF KAS ORANI</Text>
              <TextInput
              accessibilityLabel="Hedef kas oranı"
              editable={!savingTarget}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={setTargetMuscle}
              placeholder="Örn. 35"
              placeholderTextColor={colors.placeholder}
              style={[styles.modalInput, targetError && styles.inputError]}
              value={targetMuscle}
              />
            </> : null}
            {targetError ? <Text style={styles.formError}>{targetError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                disabled={savingTarget}
                onPress={() => setTargetModalVisible(false)}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                disabled={savingTarget}
                onPress={() => void submitTarget()}
                style={[styles.modalPrimary, savingTarget && styles.disabled]}
              >
                {savingTarget ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>Kaydet</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProgressTargetCard({
  label,
  icon,
  current,
  target,
  unit,
  change,
  onPress,
}: {
  label: string;
  icon: "scale-outline" | "water-outline" | "fitness-outline";
  current: number | null;
  target: number | null;
  unit?: string;
  change?: string | null;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const distance =
    current !== null && target !== null ? Math.abs(current - target) : null;
  return (
    <Pressable
      accessibilityLabel={`${label} hedefini düzenle`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.progressTargetCard, pressed && styles.pressed]}
    >
      <View style={styles.targetCardTopRow}>
        <View style={styles.targetCardIcon}>
          <Ionicons color={colors.primary} name={icon} size={15} />
        </View>
        <Ionicons color={colors.textSecondary} name="pencil-outline" size={12} />
      </View>
      <Text style={styles.targetCardLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.targetCardValue}>
        {formatDecimal(current)}{unit ? ` ${unit}` : ""}
      </Text>
      <View style={styles.targetCardDivider} />
      <Text numberOfLines={1} style={styles.targetCardGoal}>
        Hedef {formatDecimal(target)}{unit ? ` ${unit}` : ""}
      </Text>
      <Text numberOfLines={1} style={styles.targetCardChange}>
        {change ?? (distance === null ? "Hedef belirle" : `Hedefe ${formatDecimal(distance)}${unit ? ` ${unit}` : ""}`)}
      </Text>
    </Pressable>
  );
}

function StepsChartCard() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const stepCounts = STEP_CHART_VALUES.map((value, index) =>
    index <= todayIndex ? value : 0,
  );
  const elapsedCounts = stepCounts.slice(0, todayIndex + 1).filter(
    (value): value is number => value !== null,
  );
  const maximum = Math.max(1, ...elapsedCounts);
  const formatSteps = (value: number) =>
    new Intl.NumberFormat("tr-TR").format(value);
  const displayDayIndex = selectedDayIndex ?? todayIndex;
  const displaySteps = stepCounts[displayDayIndex] ?? 0;

  return (
    <View style={styles.stepsCard}>
      <View style={styles.stepsWidgetHeader}>
        <Text style={styles.stepsTitle}>Günlük Hareket</Text>
      </View>

      <View style={styles.stepsWidgetMain}>
        <View style={styles.stepsRing}>
          <View style={styles.stepsRingAccent} />
          <View style={styles.stepsRingCenter}>
            <Ionicons color={colors.text} name="walk" size={20} />
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.stepsRingValue}>
              {formatSteps(displaySteps)}
            </Text>
          </View>
        </View>
        <View accessibilityLabel="Haftalık adım grafiği" style={styles.stepsMiniChart}>
          {stepCounts.map((value, index) => {
            const isSelected = index === displayDayIndex;
            const isFuture = index > todayIndex;
            return (
              <Pressable
                accessibilityLabel={`${STEP_DAY_NAMES[index]} ${formatSteps(value)} adım`}
                accessibilityRole="button"
                key={`${STEP_DAY_LABELS[index]}-${index}`}
                onPress={() => setSelectedDayIndex(index)}
                style={({ pressed }) => [
                  styles.stepsMiniColumn,
                  isFuture && styles.stepsMiniColumnFuture,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.stepsMiniTrack}>
                  <View
                    style={[
                      styles.stepsMiniBar,
                      { height: isFuture ? 8 : 8 + (value / maximum) * 50 },
                      isSelected && styles.stepsMiniBarActive,
                      isFuture && styles.stepsMiniBarFuture,
                    ]}
                  />
                </View>
                <Text style={[styles.stepsMiniDay, isSelected && styles.stepsMiniDayActive]}>
                  {STEP_DAY_LABELS[index]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    </View>
  );
}

function MeasurementInput({
  label,
  suffix,
  value,
  error,
  onChangeText,
}: {
  label: string;
  suffix?: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label.toLocaleLowerCase("tr-TR")}
          inputMode="decimal"
          keyboardType="decimal-pad"
          onChangeText={onChangeText}
          style={styles.input}
          value={value}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
      <Text numberOfLines={2} style={styles.fieldError}>{error ?? " "}</Text>
    </View>
  );
}

const createStyles = (colors: AppThemeColors, isCompactWidth = false) => StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22 },
  headerContent: { paddingTop: 8, paddingBottom: 14, gap: 22 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10 },
  progressCards: { flexDirection: "column-reverse", gap: 22 },
  card: { padding: 20, borderWidth: 1.5, borderColor: colors.border, borderRadius: 25, backgroundColor: colors.surface },
  stepsCard: { padding: 18, borderWidth: 1.5, borderColor: colors.border, borderRadius: 25, backgroundColor: colors.surface },
  stepsWidgetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepsWidgetMain: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  stepsRing: { width: 92, height: 92, borderWidth: 7, borderColor: colors.borderSubtle, borderRadius: 46, alignItems: "center", justifyContent: "center" },
  stepsRingAccent: { position: "absolute", width: 92, height: 92, borderWidth: 7, borderLeftColor: colors.primaryBright, borderTopColor: colors.primaryBright, borderRightColor: colors.primaryBright, borderBottomColor: "transparent", borderRadius: 46, transform: [{ rotate: "-35deg" }] },
  stepsRingCenter: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  stepsRingValue: { maxWidth: 64, marginTop: 2, color: colors.text, fontSize: 16, fontWeight: "900" },
  stepsMiniChart: { flex: 1, height: 86, paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" },
  stepsMiniColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  stepsMiniColumnFuture: { opacity: 0.35 },
  stepsMiniTrack: { height: 62, justifyContent: "flex-end" },
  stepsMiniBar: { width: 11, minHeight: 8, borderRadius: 7, backgroundColor: colors.border },
  stepsMiniBarActive: { width: 15, backgroundColor: colors.primaryBright },
  stepsMiniBarFuture: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary },
  stepsMiniDay: { marginTop: 6, color: colors.textSecondary, fontSize: 8, fontWeight: "900" },
  stepsMiniDayActive: { color: colors.primaryBright },
  stepsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepsTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepsIconBox: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  stepsTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  stepsTodayValue: { marginTop: 3, color: colors.primaryBright, fontSize: 13, fontWeight: "900" },
  stepsExpandButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  selectedStepsPanel: { marginTop: 14, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surfaceElevated, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectedStepsDay: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  selectedStepsValue: { color: colors.primaryBright, fontSize: 15, fontWeight: "900" },
  stepsChart: { height: 122, marginTop: 17, paddingHorizontal: 4, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  stepsBarColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  stepsDay: { color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  stepsDayActive: { color: colors.primaryBright },
  stepsBarTrack: { height: 80, marginTop: 7, justifyContent: "flex-end" },
  stepsBar: { width: 12, minHeight: 10, borderRadius: 7, backgroundColor: colors.border },
  stepsBarActive: { width: 16, backgroundColor: colors.primaryBright },
  stepsBarSelected: { borderWidth: 2, borderColor: colors.text },
  stepsDayDot: { width: 4, height: 4, marginTop: 6, borderRadius: 2, backgroundColor: "transparent" },
  stepsDayDotActive: { backgroundColor: colors.primaryBright },
  stepsFooter: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepsFooterLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: "900" },
  stepsFooterValue: { marginTop: 3, color: colors.text, fontSize: 19, fontWeight: "900" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardHeaderCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  secondaryButton: { minHeight: 50, marginTop: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.surfaceElevated, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryButtonText: { color: colors.text, fontSize: 14, fontWeight: "900" },
  bodyHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  bodyTargetButton: { minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: colors.primarySoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  bodyTargetButtonText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  bodySummary: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 22, backgroundColor: colors.surfaceElevated, overflow: "hidden" },
  targetCardsRow: { flexDirection: "row", gap: isCompactWidth ? 6 : 9 },
  progressTargetCard: { flex: 1, minWidth: 0, minHeight: 148, padding: isCompactWidth ? 9 : 11, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface },
  targetCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  targetCardIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  targetCardLabel: { marginTop: 10, color: colors.textSecondary, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  targetCardValue: { marginTop: 4, color: colors.text, fontSize: isCompactWidth ? 16 : 19, fontWeight: "900" },
  targetCardDivider: { marginVertical: 9, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  targetCardGoal: { color: colors.textSecondary, fontSize: isCompactWidth ? 9 : 10, fontWeight: "800" },
  targetCardChange: { marginTop: 5, color: colors.primaryBright, fontSize: isCompactWidth ? 9 : 10, fontWeight: "900" },
  measurementSection: { marginTop: 12, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  measurementTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  inputRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  inputGroup: { flex: 1, minWidth: 0 },
  inputLabel: { marginBottom: 6, color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  inputShell: { height: 50, paddingHorizontal: 9, borderWidth: 1.5, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.background, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minWidth: 0, color: colors.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  inputSuffix: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  inputError: { borderColor: "#D14343" },
  fieldError: { minHeight: 31, marginTop: 4, color: "#D14343", fontSize: 8, lineHeight: 11 },
  formError: { marginTop: 8, color: "#D14343", fontSize: 11, lineHeight: 16, textAlign: "center" },
  primaryButton: { minHeight: 51, borderRadius: 18, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: colors.text, fontSize: 15, fontWeight: "900" },
  historyItem: { marginBottom: 12 },
  footerSpace: { height: 18 },
  centerState: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { color: colors.textSecondary, fontSize: 14 },
  modalBackdrop: { flex: 1, padding: 24, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center" },
  modalCard: { width: "100%", maxWidth: 420, padding: 22, borderRadius: 24, backgroundColor: colors.surfaceElevated },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  modalInputLabel: { marginTop: 14, color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  modalInput: { height: 54, marginTop: 6, paddingHorizontal: 16, borderWidth: 1.5, borderColor: colors.border, borderRadius: 17, backgroundColor: colors.inputBackground, color: colors.text, fontSize: 17, fontWeight: "800" },
  modalActions: { marginTop: 18, flexDirection: "row", gap: 10 },
  modalSecondary: { flex: 1, minHeight: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modalSecondaryText: { color: colors.text, fontSize: 14, fontWeight: "800" },
  modalPrimary: { flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});

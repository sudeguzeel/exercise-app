import {
  EmptyContent,
  HistoryCard,
  PeriodSelector,
  PersonalRecordRow,
  RoundBackButton,
  SectionTitle,
  StatCard,
  WeightSummaryRow,
} from "@/features/progress/components/progress-components";
import {
  formatDecimal,
  parsePositiveWeight,
  validateBodyMeasurement,
} from "@/features/progress/progress-domain";
import {
  saveBodyMeasurement,
  saveTargetWeight,
} from "@/features/progress/progress-storage";
import { loadProgressDashboard } from "@/features/progress/progress-service";
import type {
  ProgressDashboard,
  ProgressPeriod,
} from "@/features/progress/types";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { DataErrorState } from "@/shared/components/data-error-state";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type MeasurementFields = {
  weight: string;
  bodyFat: string;
  muscle: string;
};

const EMPTY_MEASUREMENT: MeasurementFields = {
  weight: "",
  bodyFat: "",
  muscle: "",
};

export default function ProgressScreen() {
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
  const [targetWeight, setTargetWeight] = useState("");
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

  const openTargetModal = useCallback(() => {
    setTargetWeight(
      dashboard?.bodyProgress.targetWeightKg === null ||
        dashboard?.bodyProgress.targetWeightKg === undefined
        ? ""
        : String(dashboard.bodyProgress.targetWeightKg),
    );
    setTargetError(null);
    setTargetModalVisible(true);
  }, [dashboard]);

  const submitTarget = useCallback(async () => {
    if (savingTarget) return;
    const parsed = parsePositiveWeight(targetWeight);
    if (parsed === null) {
      setTargetError("0 ile 500 kg arasında geçerli bir hedef girin.");
      return;
    }
    setSavingTarget(true);
    setTargetError(null);
    try {
      await saveTargetWeight(parsed);
      setTargetModalVisible(false);
      await load(true);
    } catch (error) {
      setTargetError(
        error instanceof Error ? error.message : "Hedef kilo kaydedilemedi.",
      );
    } finally {
      setSavingTarget(false);
    }
  }, [load, savingTarget, targetWeight]);

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
          <ActivityIndicator color={MainColors.primary} size="large" />
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
  const difference =
    body.currentWeightKg !== null && body.targetWeightKg !== null
      ? body.currentWeightKg - body.targetWeightKg
      : null;
  const remaining = Math.max(
    0,
    dashboard.periodTargetCount - dashboard.periodCompletedCount,
  );

  const header = (
    <View style={styles.headerContent}>
      <RoundBackButton onPress={() => router.back()} />
      <Text style={styles.title}>İlerlemen</Text>
      <PeriodSelector onChange={setPeriod} value={period} />

      <View style={styles.statsRow}>
        <StatCard
          detail={`+${dashboard.periodCompletedCount} bu dönem`}
          label="TOPLAM"
          value={String(dashboard.totalCompletedCount)}
        />
        <StatCard
          detail={
            dashboard.periodTargetCount === 0
              ? "hedef bulunmuyor"
              : remaining > 0
                ? `hedefe ${remaining} kaldı`
                : "hedef tamamlandı"
          }
          label={dashboard.periodLabel}
          value={
            dashboard.periodTargetCount > 0
              ? `${dashboard.periodCompletedCount}/${dashboard.periodTargetCount}`
              : String(dashboard.periodCompletedCount)
          }
        />
        <StatCard
          detail={`en uzun ${dashboard.longestStreak}g`}
          label="SERİ"
          value={`${dashboard.currentStreak}g`}
        />
      </View>

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={openWeights}
          style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
        >
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Hareket Ağırlıkların</Text>
            <Text style={styles.cardDescription}>
              Programındaki hareketlerde kullandığın güncel çalışma kiloları.
            </Text>
          </View>
          <View style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={18} color={MainColors.text} />
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
              <Ionicons name="chevron-forward" size={16} color={MainColors.text} />
            </Pressable>
          </>
        ) : (
          <>
            <EmptyContent
              description="Hareketlerini açıp ilk çalışma kilonu kaydedebilirsin."
              icon="barbell-outline"
              title="Henüz çalışma kilosu yok"
            />
            <Pressable onPress={openWeights} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Hareketleri aç</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.bodyHeader}>
          <View style={styles.cardHeaderCopy}>
            <Text style={styles.cardTitle}>Vücut İlerlemen</Text>
            <Text style={styles.cardDescription}>Güncel ölçümlerin ve belirlediğin hedef.</Text>
          </View>
          <Pressable onPress={openTargetModal} style={styles.targetButton}>
            <Text style={styles.targetButtonText}>Hedefi değiştir</Text>
          </Pressable>
        </View>
        <View style={styles.bodySummary}>
          <Text style={styles.bodyEyebrow}>GÜNCEL KİLON</Text>
          <View style={styles.currentWeightRow}>
            <Text style={styles.currentWeight}>{formatDecimal(body.currentWeightKg)}</Text>
            <Text style={styles.currentWeightUnit}>kg</Text>
            <View style={styles.targetSummary}>
              <Text style={styles.targetSummaryText}>Hedef {formatDecimal(body.targetWeightKg)} kg</Text>
              <Text style={styles.targetDifference}>
                {difference === null
                  ? "Hedef farkı yok"
                  : `${difference > 0 ? "-" : "+"}${formatDecimal(Math.abs(difference))} kg değişim`}
              </Text>
            </View>
          </View>
          <View style={styles.bodyMetricsRow}>
            <BodyMetric label="BAŞLANGIÇ" value={`${formatDecimal(body.startingWeightKg)} kg`} />
            <BodyMetric label="YAĞ ORANI" value={`${formatDecimal(body.bodyFatPercentage)} %`} />
            <BodyMetric label="KAS ORANI" value={`${formatDecimal(body.musclePercentage)} %`} />
          </View>
        </View>

        <View style={styles.measurementSection}>
          <Text style={styles.measurementTitle}>Yeni ölçüm ekle</Text>
          <Text style={styles.cardDescription}>Bugünkü kilo, yağ ve kas oranını birlikte kaydet.</Text>
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
              suffix="%"
              value={measurement.bodyFat}
            />
            <MeasurementInput
              error={measurementErrors.muscle}
              label="KAS"
              onChangeText={(muscle) => setMeasurement((current) => ({ ...current, muscle }))}
              suffix="%"
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
              <ActivityIndicator color={MainColors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>Ölçümlerimi kaydet</Text>
            )}
          </Pressable>
        </View>
      </View>

      <SectionTitle>KİŞİSEL REKORLAR</SectionTitle>
      {dashboard.personalRecords.length > 0 ? (
        <View style={styles.sectionGap}>
          {dashboard.personalRecords.map((record) => (
            <PersonalRecordRow key={record.id} record={record} />
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <EmptyContent
            description="Rekorlar yalnızca tamamlanmış antrenman ve setlerden hesaplanır."
            icon="trophy-outline"
            title="Henüz kişisel rekor yok"
          />
        </View>
      )}

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
              colors={[MainColors.primary]}
              onRefresh={() => void load(true)}
              refreshing={refreshing}
              tintColor={MainColors.primary}
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
            <Text style={styles.modalTitle}>Hedef kilonu değiştir</Text>
            <Text style={styles.modalDescription}>Yeni hedef kilo değerini kilogram olarak gir.</Text>
            <TextInput
              accessibilityLabel="Hedef kilo"
              editable={!savingTarget}
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={setTargetWeight}
              placeholder="Örn. 70"
              placeholderTextColor={MainColors.mutedText}
              style={[styles.modalInput, targetError && styles.inputError]}
              value={targetWeight}
            />
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
                  <ActivityIndicator color={MainColors.text} />
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

function BodyMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.bodyMetric}>
      <Text style={styles.bodyMetricLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.bodyMetricValue}>{value}</Text>
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
  suffix: string;
  value: string;
  error?: string;
  onChangeText: (value: string) => void;
}) {
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
        <Text style={styles.inputSuffix}>{suffix}</Text>
      </View>
      <Text numberOfLines={2} style={styles.fieldError}>{error ?? " "}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  listContent: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22 },
  headerContent: { paddingTop: 8, paddingBottom: 14, gap: 22 },
  title: { color: MainColors.text, fontSize: 31, lineHeight: 37, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 10 },
  card: { padding: 20, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 25, backgroundColor: MainColors.surface },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardHeaderCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: MainColors.text, fontSize: 19, fontWeight: "900" },
  cardDescription: { marginTop: 4, color: MainColors.mutedText, fontSize: 13, lineHeight: 19 },
  arrowButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: MainColors.paleGreen, alignItems: "center", justifyContent: "center" },
  secondaryButton: { minHeight: 50, marginTop: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: "#F0F2EC", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryButtonText: { color: MainColors.text, fontSize: 14, fontWeight: "900" },
  bodyHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  targetButton: { marginTop: 2, minHeight: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: MainColors.paleGreen, alignItems: "center", justifyContent: "center" },
  targetButtonText: { color: MainColors.primary, fontSize: 11, fontWeight: "900" },
  bodySummary: { marginTop: 16, padding: 17, borderRadius: 22, backgroundColor: "#171B1E" },
  bodyEyebrow: { color: "#8F9491", fontSize: 10, fontWeight: "900" },
  currentWeightRow: { marginTop: 6, flexDirection: "row", alignItems: "flex-end" },
  currentWeight: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  currentWeightUnit: { marginLeft: 6, marginBottom: 5, color: "#A8ADAA", fontSize: 12, fontWeight: "800" },
  targetSummary: { marginLeft: "auto", alignItems: "flex-end" },
  targetSummaryText: { color: "#D8DBD9", fontSize: 12, fontWeight: "800" },
  targetDifference: { marginTop: 3, color: MainColors.primaryBright, fontSize: 11, fontWeight: "900" },
  bodyMetricsRow: { marginTop: 15, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#3C4140", flexDirection: "row", gap: 10 },
  bodyMetric: { flex: 1, minWidth: 0 },
  bodyMetricLabel: { color: "#8F9491", fontSize: 8, fontWeight: "800" },
  bodyMetricValue: { marginTop: 5, color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  measurementSection: { marginTop: 18, paddingTop: 17, borderTopWidth: 1, borderTopColor: MainColors.border },
  measurementTitle: { color: MainColors.text, fontSize: 16, fontWeight: "900" },
  inputRow: { marginTop: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  inputGroup: { flex: 1, minWidth: 0 },
  inputLabel: { marginBottom: 6, color: MainColors.mutedText, fontSize: 10, fontWeight: "900" },
  inputShell: { height: 50, paddingHorizontal: 9, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 15, backgroundColor: MainColors.background, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, minWidth: 0, color: MainColors.text, fontSize: 15, fontWeight: "900", textAlign: "center" },
  inputSuffix: { color: MainColors.mutedText, fontSize: 10, fontWeight: "800" },
  inputError: { borderColor: "#D14343" },
  fieldError: { minHeight: 31, marginTop: 4, color: "#D14343", fontSize: 8, lineHeight: 11 },
  formError: { marginTop: 8, color: "#D14343", fontSize: 11, lineHeight: 16, textAlign: "center" },
  primaryButton: { minHeight: 51, borderRadius: 18, backgroundColor: MainColors.primaryBright, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: MainColors.text, fontSize: 15, fontWeight: "900" },
  sectionGap: { gap: 10 },
  historyItem: { marginBottom: 12 },
  footerSpace: { height: 18 },
  centerState: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { color: MainColors.mutedText, fontSize: 14 },
  modalBackdrop: { flex: 1, padding: 24, backgroundColor: "rgba(0,0,0,0.42)", alignItems: "center", justifyContent: "center" },
  modalCard: { width: "100%", maxWidth: 420, padding: 22, borderRadius: 24, backgroundColor: MainColors.surface },
  modalTitle: { color: MainColors.text, fontSize: 22, fontWeight: "900" },
  modalDescription: { marginTop: 7, color: MainColors.mutedText, fontSize: 13, lineHeight: 19 },
  modalInput: { height: 54, marginTop: 18, paddingHorizontal: 16, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 17, color: MainColors.text, fontSize: 17, fontWeight: "800" },
  modalActions: { marginTop: 18, flexDirection: "row", gap: 10 },
  modalSecondary: { flex: 1, minHeight: 50, borderWidth: 1.5, borderColor: MainColors.border, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modalSecondaryText: { color: MainColors.text, fontSize: 14, fontWeight: "800" },
  modalPrimary: { flex: 1, minHeight: 50, borderRadius: 17, backgroundColor: MainColors.primaryBright, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});

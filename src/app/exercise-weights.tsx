import { RoundBackButton } from "@/features/progress/components/progress-components";
import { formatWeightKg } from "@/features/progress/progress-domain";
import {
  loadExerciseWeightItems,
} from "@/features/progress/progress-service";
import { saveWorkingWeight } from "@/features/progress/progress-storage";
import type { ExerciseWeightItem } from "@/features/progress/types";
import { DataErrorState } from "@/shared/components/data-error-state";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WEIGHT_STEP_KG = 2.5;
const ALL_FILTER = "Tümü";

export default function ExerciseWeightsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const savingIdsRef = useRef(new Set<string>());
  const [items, setItems] = useState<ExerciseWeightItem[]>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setLoadError(null);
    try {
      const result = await loadExerciseWeightItems();
      setItems(result);
      setDrafts(
        Object.fromEntries(
          result.map((item) => [item.programExerciseId, String(item.weightKg)]),
        ),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Hareket kiloları yüklenemedi.",
      );
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filters = useMemo(
    () => [
      ALL_FILTER,
      ...new Set(
        (items ?? [])
          .map((item) => item.muscleGroupName)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [items],
  );
  const filteredItems = useMemo(
    () =>
      (items ?? []).filter(
        (item) =>
          activeFilter === ALL_FILTER || item.muscleGroupName === activeFilter,
      ),
    [activeFilter, items],
  );

  const changeWeight = useCallback(
    (programExerciseId: string, amount: number) => {
      setDrafts((current) => {
        const parsed = Number((current[programExerciseId] ?? "0").replace(",", "."));
        const safe = Number.isFinite(parsed) ? parsed : 0;
        const next = Math.min(500, Math.max(0, safe + amount));
        return { ...current, [programExerciseId]: String(next) };
      });
      setErrors((current) => ({ ...current, [programExerciseId]: undefined }));
    },
    [],
  );

  const saveItem = useCallback(
    async (item: ExerciseWeightItem) => {
      if (savingIdsRef.current.has(item.programExerciseId)) return;
      const parsed = Number(
        (drafts[item.programExerciseId] ?? "").trim().replace(",", "."),
      );
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 500) {
        setErrors((current) => ({
          ...current,
          [item.programExerciseId]: "0–500 arasında geçerli bir kilo girin.",
        }));
        return;
      }
      if (parsed === item.weightKg) return;

      savingIdsRef.current.add(item.programExerciseId);
      setSavingIds((current) => new Set(current).add(item.programExerciseId));
      setErrors((current) => ({ ...current, [item.programExerciseId]: undefined }));
      try {
        const saved = await saveWorkingWeight({
          programExerciseId: item.programExerciseId,
          exerciseId: item.exerciseId,
          weightKg: parsed,
        });
        setItems((current) =>
          current?.map((currentItem) =>
            currentItem.programExerciseId === item.programExerciseId
              ? {
                  ...currentItem,
                  ...saved,
                  hasWeightRecord: true,
                  weightSource: "stored",
                }
              : currentItem,
          ),
        );
        setDrafts((current) => ({
          ...current,
          [item.programExerciseId]: String(saved.weightKg),
        }));
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [item.programExerciseId]:
            error instanceof Error ? error.message : "Kilo güncellenemedi.",
        }));
      } finally {
        savingIdsRef.current.delete(item.programExerciseId);
        setSavingIds((current) => {
          const next = new Set(current);
          next.delete(item.programExerciseId);
          return next;
        });
      }
    },
    [drafts],
  );

  if (!items && !loadError) {
    return <ScreenState loading text="Hareketlerin yükleniyor…" />;
  }
  if (!items || loadError) {
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

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <FlatList
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={34} color={colors.primary} />
            <Text style={styles.emptyTitle}>Bu filtrede hareket yok</Text>
            <Text style={styles.emptyDescription}>
              Başka bir kas grubu seçebilir veya programına hareket ekleyebilirsin.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <RoundBackButton onPress={() => router.replace("/progress" as never)} />
              <Text style={styles.topTitle}>İlerlemen</Text>
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.title}>Hareket Kilolarını Güncelle</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="barbell-outline" size={25} color={colors.onPrimary} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>Çalışma kiloların</Text>
              </View>
              <Text style={styles.summaryCount}>{items.length}</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.filterContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {filters.map((filter) => {
                const selected = activeFilter === filter;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.filterButton, selected && styles.filterSelected]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={filteredItems}
        keyExtractor={(item) => item.programExerciseId}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => {
          const draft = drafts[item.programExerciseId] ?? "0";
          const numericDraft = Number(draft.replace(",", "."));
          const changed = Number.isFinite(numericDraft) && numericDraft !== item.weightKg;
          const saving = savingIds.has(item.programExerciseId);
          return (
            <View style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseIcon}>
                  <Ionicons name="barbell-outline" size={20} color={colors.textSecondary} />
                </View>
                <View style={styles.exerciseCopy}>
                  <Text numberOfLines={2} style={styles.exerciseName}>{item.exerciseName}</Text>
                  <Text numberOfLines={2} style={styles.exerciseMeta}>
                    {[item.muscleGroupName, item.programName, `${item.sets} set × ${item.reps} tekrar`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <View style={styles.currentBox}>
                  <Text style={styles.currentValue}>
                    {item.hasWeightRecord ? formatWeightKg(item.weightKg) : "—"}
                  </Text>
                  <Text style={styles.currentLabel}>GÜNCEL</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.controlRow}>
                <Pressable
                  accessibilityLabel={`${item.exerciseName} kilosunu azalt`}
                  onPress={() => changeWeight(item.programExerciseId, -WEIGHT_STEP_KG)}
                  style={styles.controlButton}
                >
                  <Ionicons name="remove" size={25} color={colors.text} />
                </Pressable>
                <View style={[styles.inputShell, errors[item.programExerciseId] && styles.errorBorder]}>
                  <TextInput
                    accessibilityLabel={`${item.exerciseName} çalışma kilosu`}
                    inputMode="decimal"
                    keyboardType="decimal-pad"
                    onChangeText={(value) => {
                      setDrafts((current) => ({ ...current, [item.programExerciseId]: value }));
                      setErrors((current) => ({ ...current, [item.programExerciseId]: undefined }));
                    }}
                    style={styles.input}
                    value={draft}
                  />
                  <Text style={styles.inputSuffix}>kg</Text>
                </View>
                <Pressable
                  accessibilityLabel={`${item.exerciseName} kilosunu artır`}
                  onPress={() => changeWeight(item.programExerciseId, WEIGHT_STEP_KG)}
                  style={styles.controlButton}
                >
                  <Ionicons name="add" size={25} color={colors.text} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: saving, disabled: saving || !changed }}
                  disabled={saving || !changed}
                  onPress={() => void saveItem(item)}
                  style={[styles.updateButton, (!changed || saving) && styles.disabled]}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.updateText}>Güncelle</Text>
                  )}
                </Pressable>
              </View>
              {errors[item.programExerciseId] ? (
                <Text style={styles.errorText}>{errors[item.programExerciseId]}</Text>
              ) : null}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function ScreenState({ loading, text }: { loading?: boolean; text: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centerState}>
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
        <Text style={styles.stateText}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  listContent: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22, paddingBottom: 30 },
  header: { paddingTop: 8, paddingBottom: 18 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.textSecondary, fontSize: 17, fontWeight: "700" },
  headerSpacer: { width: 42 },
  title: { marginTop: 34, color: colors.text, fontSize: 31, lineHeight: 38, fontWeight: "900" },
  summaryCard: { marginTop: 20, minHeight: 120, padding: 18, borderWidth: 1.5, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surfaceElevated, flexDirection: "row", alignItems: "center", gap: 14 },
  summaryIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  summaryCount: { color: colors.text, fontSize: 28, fontWeight: "900" },
  filterContent: { paddingTop: 16, gap: 10 },
  filterButton: { minHeight: 48, paddingHorizontal: 22, borderWidth: 1.5, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  filterSelected: { borderColor: colors.primaryBright, backgroundColor: colors.primaryBright },
  filterText: { color: colors.textSecondary, fontSize: 16, fontWeight: "900" },
  filterTextSelected: { color: colors.onPrimary },
  exerciseCard: { marginBottom: 14, padding: 18, borderWidth: 1.5, borderColor: colors.border, borderRadius: 25, backgroundColor: colors.surface },
  exerciseHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  exerciseIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  exerciseCopy: { flex: 1, minWidth: 0 },
  exerciseName: { color: colors.text, fontSize: 18, fontWeight: "900" },
  exerciseMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  currentBox: { minWidth: 76, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, backgroundColor: colors.surfaceElevated, alignItems: "center" },
  currentValue: { color: colors.text, fontSize: 17, fontWeight: "900" },
  currentLabel: { marginTop: 2, color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  divider: { height: 1, marginVertical: 16, backgroundColor: colors.borderSubtle },
  controlRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  controlButton: { width: 48, height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" },
  inputShell: { flex: 1, minWidth: 0, height: 50, paddingHorizontal: 10, borderWidth: 1.5, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.inputBackground, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minWidth: 0, color: colors.text, fontSize: 19, fontWeight: "900", textAlign: "center" },
  inputSuffix: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  updateButton: { minWidth: 104, height: 50, paddingHorizontal: 14, borderRadius: 15, backgroundColor: colors.primaryBright, alignItems: "center", justifyContent: "center" },
  updateText: { color: colors.onPrimary, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  errorBorder: { borderColor: colors.error },
  errorText: { marginTop: 8, color: colors.error, fontSize: 11, textAlign: "center" },
  emptyCard: { padding: 28, borderWidth: 1.5, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center" },
  emptyTitle: { marginTop: 12, color: colors.text, fontSize: 18, fontWeight: "900" },
  emptyDescription: { marginTop: 7, color: colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center" },
  centerState: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { color: colors.textSecondary, fontSize: 14 },
});

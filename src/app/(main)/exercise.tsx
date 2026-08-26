import { ExerciseCard } from "@/features/exercises/components/exercise-card";
import { type ExerciseListItem } from "@/features/exercises/exercise-catalog";
import {
  parseInitialTrainingDay,
  type ProgramSelectionSearchParams,
} from "@/features/exercises/program-selection";
import { useAppTheme } from "@/providers/AppThemeContext";
import { useFavorites } from "@/providers/FavoritesContext";
import { DataErrorState } from "@/shared/components/data-error-state";
import type { AppThemeColors } from "@/shared/constants/theme";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import {
  EXERCISE_PAGE_SIZE,
  getBodyParts,
  getEquipments,
  searchExercises,
  type BodyPartOption,
  type ExerciseFilterOption
} from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { useScrollToTop } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SEARCH_DEBOUNCE_MS = 300;

export default function ExerciseScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isOffline } = useConnectivity();
  const params = useLocalSearchParams<ProgramSelectionSearchParams & {
    selectionMode?: string | string[];
    editProgramId?: string | string[];
    selectedDate?: string | string[];
  }>();
  const initialTrainingDay = useMemo(
    () => parseInitialTrainingDay(params),
    [params],
  );
  const selectionMode = Array.isArray(params.selectionMode)
    ? params.selectionMode[0]
    : params.selectionMode;
  const editProgramId = Array.isArray(params.editProgramId)
    ? params.editProgramId[0]
    : params.editProgramId;
  const selectedDate = Array.isArray(params.selectedDate)
    ? params.selectedDate[0]
    : params.selectedDate;
  const isProgramEditSelection =
    selectionMode === "program-edit" && Boolean(editProgramId);
  const listRef = useRef<FlatList<ExerciseListItem>>(null);
  const isNewProgramSelection = selectionMode === "new-program";
  const [bodyParts, setBodyParts] = useState<BodyPartOption[]>([]);
  const [equipments, setEquipments] = useState<ExerciseFilterOption[]>([]);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
  null,
);

const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(
  null,
);
  const [activeFilter, setActiveFilter] = useState<
  "bodyPart" | "equipment" | null
>(null);
  const [exercises, setExercises] = useState<ExerciseListItem[]>([]);
  const [listState, setListState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offlineErrorDismissed, setOfflineErrorDismissed] = useState(false);
  const requestIdRef = useRef(0);
  const hasSuccessfulDataRef = useRef(false);
  useScrollToTop(listRef);
  const selectedBodyPartName = selectedCategoryId
  ? bodyParts.find((item) => item.id === selectedCategoryId)?.name ?? "Tümü"
  : "Tümü";
const selectedEquipmentName = selectedEquipmentId
  ? equipments.find((item) => item.id === selectedEquipmentId)?.name ?? "Tümü"
  : "Tümü";
  const activeFilterOptions =
  activeFilter === "bodyPart" ? bodyParts : equipments;

const activeFilterTitle =
  activeFilter === "bodyPart" ? "Bölge Seç" : "Ekipman Seç";

const activeSelectedId =
  activeFilter === "bodyPart"
    ? selectedCategoryId
    : selectedEquipmentId;
  useEffect(() => {
  void getBodyParts().then(setBodyParts);
  void getEquipments().then(setEquipments);
}, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const loadExercises = useCallback(
    async (offset: number, append: boolean) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setListState("loading");
      }

      try {
        const result = await searchExercises({
  search: debouncedSearch,
  bodyPartId: selectedCategoryId,
  equipmentId: selectedEquipmentId,
  offset,
});

        if (requestIdRef.current !== requestId) {
          return;
        }

        setExercises((current) =>
          append ? [...current, ...result.items] : result.items,
        );
        setHasMore(result.hasMore);
        hasSuccessfulDataRef.current = true;
        setListState("success");
      } catch {
        if (requestIdRef.current === requestId) {
          setListState("error");
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoadingMore(false);
        }
      }
    },
    [
  debouncedSearch,
  selectedCategoryId,
  selectedEquipmentId,
],
  );

  useEffect(() => {
    void loadExercises(0, false);
  }, [loadExercises]);

  useEffect(() => {
    if (!isOffline) {
      setOfflineErrorDismissed(false);
      return;
    }
    if (!offlineErrorDismissed) {
      setListState("error");
    }
  }, [isOffline, offlineErrorDismissed]);

  const handleExercisePress = useCallback(
    (exercise: ExerciseListItem) => {
      router.push({
        pathname: "/exercise-detail",
        params: {
          exerciseId: exercise.id,
          ...(isProgramEditSelection
            ? { selectionMode: "program-edit", editProgramId, selectedDate }
            : isNewProgramSelection
              ? {
                  selectionMode: "new-program",
                  selectedDate,
                  ...(initialTrainingDay ? { initialTrainingDay } : {}),
                }
              : {}),
        },
      });
    },
    [editProgramId, initialTrainingDay, isNewProgramSelection, isProgramEditSelection, selectedDate],
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoadingMore || listState !== "success") {
      return;
    }
    void loadExercises(exercises.length, true);
  }, [exercises.length, hasMore, isLoadingMore, listState, loadExercises]);

  const renderExercise = useCallback<ListRenderItem<ExerciseListItem>>(
    ({ item }) => (
      <ExerciseCard
        exercise={item}
        favorited={isFavorite(item.id)}
        onFavoritePress={toggleFavorite}
        onPress={handleExercisePress}
      />
    ),
    [handleExercisePress, isFavorite, toggleFavorite],
  );
  const errorVariant = isOffline ? "offline" : "service";
  const dismissOfflineError = hasSuccessfulDataRef.current
    ? () => {
        setOfflineErrorDismissed(true);
        setListState("success");
      }
    : undefined;

  if (listState === "error") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DataErrorState
          errorCode="FIT-SERVICE-EXERCISE"
          onRetry={() => void loadExercises(0, false)}
          onSecondaryAction={
            errorVariant === "offline"
              ? dismissOfflineError
              : () => router.replace("/(main)")
          }
          secondaryActionDisabled={
            errorVariant === "offline" && !hasSuccessfulDataRef.current
          }
          variant={errorVariant}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        ref={listRef}
        data={exercises}
        renderItem={renderExercise}
        keyExtractor={(exercise) => exercise.id}
        ItemSeparatorComponent={ExerciseSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
          <View style={styles.headerRow}>
  {isNewProgramSelection ? (
    <View style={styles.programActionRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Programlara geri dön"
        onPress={() =>
          router.replace({
            pathname: "/(main)/program" as never,
            params: selectedDate ? { selectedDate } : {},
          })
        }
        style={styles.profileButton}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorileri aç"
        onPress={() => router.push("/(main)/favorites" as never)}
        style={styles.profileButton}
      >
        <Ionicons name="heart-outline" size={24} color={colors.text} />
      </Pressable>
    </View>
  ) : isProgramEditSelection ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Program düzenlemeye geri dön"
      onPress={() =>
        router.replace({
          pathname: "/program-edit" as never,
          params: {
            programId: editProgramId!,
            ...(selectedDate ? { selectedDate } : {}),
          },
        })
      }
      style={styles.profileButton}
    >
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Favorileri aç"
      onPress={() => router.push("/(main)/favorites" as never)}
      style={styles.profileButton}
    >
      <Ionicons name="heart-outline" size={24} color={colors.text} />
    </Pressable>
  )}
</View>

  <Text maxFontSizeMultiplier={1.3} style={styles.title}>
    {isProgramEditSelection ? "Programa egzersiz ekle" : "Egzersizler"}
  </Text>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={24}
                color={colors.textSecondary}
              />
              <TextInput
                accessibilityLabel="Egzersiz ara"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                maxFontSizeMultiplier={1.3}
                onChangeText={setSearchText}
                placeholder="Egzersiz ara..."
                placeholderTextColor={colors.placeholder}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchText}
              />
            </View>
            <View style={styles.filterRow}>
  <View style={styles.filterColumn}>
    <Text style={styles.filterLabel}>Bölge</Text>

    <Pressable
      onPress={() => setActiveFilter("bodyPart")}
      style={({ pressed }) => [
        styles.filterButton,
        selectedCategoryId && styles.filterButtonSelected,
        pressed && styles.categoryButtonPressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={styles.filterButtonText}
      >
        {selectedBodyPartName}
      </Text>

      <Ionicons
        name="chevron-down"
        size={17}
        color={colors.textSecondary}
      />
    </Pressable>
  </View>
   <Modal
  animationType="slide"
  transparent
  visible={activeFilter !== null}
  onRequestClose={() => setActiveFilter(null)}
>
  <Pressable
    style={styles.modalOverlay}
    onPress={() => setActiveFilter(null)}
  >
    <Pressable
      style={styles.filterSheet}
      onPress={(event) => event.stopPropagation()}
    >
      <View style={styles.filterSheetHeader}>
        <Text style={styles.filterSheetTitle}>
          {activeFilterTitle}
        </Text>

        <Pressable onPress={() => setActiveFilter(null)}>
          <Ionicons
            name="close"
            size={24}
            color={colors.text}
          />
        </Pressable>
      </View>

      <Pressable
        style={styles.filterOption}
        onPress={() => {
          if (activeFilter === "bodyPart") {
            setSelectedCategoryId(null);
          } else {
            setSelectedEquipmentId(null);
          }

          setActiveFilter(null);
        }}
      >
        <Text style={styles.filterOptionText}>Tümü</Text>

        <Ionicons
          name={activeSelectedId === null ? "radio-button-on" : "radio-button-off"}
          size={22}
          color={colors.primary}
        />
      </Pressable>

      <FlatList
        data={activeFilterOptions}
        keyExtractor={(item) => item.id}
        style={styles.filterOptionsList}
        renderItem={({ item }) => {
          const isSelected = activeSelectedId === item.id;

          return (
            <Pressable
              style={styles.filterOption}
              onPress={() => {
                if (activeFilter === "bodyPart") {
                  setSelectedCategoryId(item.id);
                } else {
                  setSelectedEquipmentId(item.id);
                }

                setActiveFilter(null);
              }}
            >
              <Text style={styles.filterOptionText}>
                {item.name}
              </Text>

              <Ionicons
                name={
                  isSelected
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={22}
                color={colors.primary}
              />
            </Pressable>
          );
        }}
      />
    </Pressable>
  </Pressable>
</Modal>
  <View style={styles.filterColumn}>
    <Text style={styles.filterLabel}>Ekipman</Text>

    <Pressable
      onPress={() => setActiveFilter("equipment")}
      style={({ pressed }) => [
        styles.filterButton,
        selectedEquipmentId && styles.filterButtonSelected,
        pressed && styles.categoryButtonPressed,
      ]}
    >
      <Text
        numberOfLines={1}
        style={styles.filterButtonText}
      >
        {selectedEquipmentName}
      </Text>

      <Ionicons
        name="chevron-down"
        size={17}
        color={colors.textSecondary}
      />
    </Pressable>
  </View>
</View>

          </View>
        }
        ListEmptyComponent={
          listState === "loading" ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="search-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
                Eşleşen egzersiz bulunamadı
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        initialNumToRender={EXERCISE_PAGE_SIZE}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={EXERCISE_PAGE_SIZE}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.35}
        removeClippedSubviews={Platform.OS === "android"}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

function ExerciseSeparator() {
  const { colors } = useAppTheme();
  return <View style={[separatorBase, { backgroundColor: colors.borderSubtle }]} />;
}

const separatorBase = { height: 10 };

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    paddingBottom: 28,
  },
  headerRow: {
    minHeight: 64,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  profileButton: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  programActionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    marginTop: 14,
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  searchContainer: {
    height: 56,
    marginTop: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.inputBackground,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
 searchInput: {
  flex: 1,
  height: "100%",
  paddingVertical: 0,
  color: colors.text,
  fontSize: 16,
  fontWeight: "600",
},

filterRow: {
  flexDirection: "row",
  gap: 12,
  marginTop: 20,
},

filterColumn: {
  flex: 1,
  gap: 8,
},

filterLabel: {
  color: colors.textSecondary,
  fontSize: 14,
  fontWeight: "700",
},

filterButton: {
  height: 48,
  paddingHorizontal: 16,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: 24,
  backgroundColor: colors.surface,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
},

filterButtonSelected: {
  borderColor: colors.primaryBright,
},

filterButtonText: {
  flex: 1,
  color: colors.text,
  fontSize: 15,
  fontWeight: "700",
},

categoryButtonPressed: {
  opacity: 0.72,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.45)",
  justifyContent: "flex-end",
},

filterSheet: {
  maxHeight: "70%",
  paddingTop: 10,
  paddingHorizontal: 20,
  paddingBottom: 24,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
  backgroundColor: colors.background,
},

filterSheetHeader: {
  minHeight: 56,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

filterSheetTitle: {
  color: colors.text,
  fontSize: 20,
  fontWeight: "800",
},

filterOptionsList: {
  maxHeight: 430,
},

filterOption: {
  minHeight: 54,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.borderSubtle,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},

filterOptionText: {
  flex: 1,
  color: colors.text,
  fontSize: 16,
  fontWeight: "600",
},
emptyState: {
  minHeight: 180,
  paddingHorizontal: 24,
  alignItems: "center",
  justifyContent: "center",
},

emptyText: {
  marginTop: 10,
  color: colors.textSecondary,
  fontSize: 16,
  lineHeight: 23,
  fontWeight: "700",
  textAlign: "center",
},

footerLoading: {
  paddingVertical: 20,
  alignItems: "center",
},
});

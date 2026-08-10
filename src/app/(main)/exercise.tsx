import { ExerciseCard } from "@/features/exercises/components/exercise-card";
import {
  buildCategoryFilters,
  type ExerciseListItem,
} from "@/features/exercises/exercise-catalog";
import {
  parseInitialTrainingDay,
  type ProgramSelectionSearchParams,
} from "@/features/exercises/program-selection";
import { DataErrorState } from "@/shared/components/data-error-state";
import { MainColors } from "@/shared/constants/theme";
import { useFavorites } from "@/providers/FavoritesContext";
import { useConnectivity } from "@/shared/hooks/use-connectivity";
import {
  EXERCISE_PAGE_SIZE,
  getBodyParts,
  searchExercises,
  type BodyPartOption,
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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SEARCH_DEBOUNCE_MS = 300;

export default function ExerciseScreen() {
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
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
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

  const categoryFilters = useMemo(
    () => buildCategoryFilters(bodyParts),
    [bodyParts],
  );

  useEffect(() => {
    void getBodyParts().then(setBodyParts);
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
          offset,
        });

        if (requestIdRef.current !== requestId) {
          // Bu istek sırasında arama/filtre değişti, sonucu yok say.
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
    [debouncedSearch, selectedCategoryId],
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
          <View style={styles.profileRow}>
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
        <Ionicons
          name="chevron-back"
          size={25}
          color={MainColors.text}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Favorileri aç"
        onPress={() => router.push("/(main)/favorites" as never)}
        style={styles.profileButton}
      >
        <Ionicons
          name="heart-outline"
          size={25}
          color={MainColors.text}
        />
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
      style={[styles.profileButton, styles.programEditBackButton]}
    >
      <Ionicons
        name="chevron-back"
        size={25}
        color={MainColors.text}
      />
    </Pressable>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Favorileri aç"
      onPress={() => router.push("/(main)/favorites" as never)}
      style={styles.profileButton}
    >
      <Ionicons
        name="heart-outline"
        size={25}
        color={MainColors.text}
      />
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
                color={MainColors.mutedText}
              />
              <TextInput
                accessibilityLabel="Egzersiz ara"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                maxFontSizeMultiplier={1.3}
                onChangeText={setSearchText}
                placeholder="Egzersiz ara..."
                placeholderTextColor={MainColors.mutedText}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchText}
              />
            </View>

            <ScrollView
              horizontal
              contentContainerStyle={styles.categoryContent}
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              style={styles.categoryList}
            >
              {categoryFilters.map((category) => {
                const isSelected = selectedCategoryId === category.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={category.id ?? "all"}
                    onPress={() => setSelectedCategoryId(category.id)}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      isSelected && styles.categoryButtonSelected,
                      pressed && styles.categoryButtonPressed,
                    ]}
                  >
                    <Text
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                      style={[
                        styles.categoryText,
                        isSelected && styles.categoryTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

          </View>
        }
        ListEmptyComponent={
          listState === "loading" ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={MainColors.primary} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="search-outline"
                size={28}
                color={MainColors.mutedText}
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
              <ActivityIndicator color={MainColors.primary} />
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
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MainColors.background,
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
  profileRow: {
    minHeight: 52,
    alignItems: "flex-end",
  },
  profileButton: {
    width: 50,
    height: 50,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 25,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  programActionRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  programEditBackButton: {
    alignSelf: "flex-start",
  },
  title: {
    marginTop: 36,
    color: MainColors.text,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "900",
  },
  searchContainer: {
    height: 56,
    marginTop: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    color: MainColors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  categoryList: {
    marginTop: 20,
    marginHorizontal: -20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryButton: {
    minWidth: 92,
    height: 48,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryButtonSelected: {
    borderColor: MainColors.primaryBright,
    backgroundColor: MainColors.primaryBright,
  },
  categoryButtonPressed: {
    opacity: 0.72,
  },
  categoryText: {
    color: MainColors.mutedText,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryTextSelected: {
    color: MainColors.text,
  },
  separator: {
    height: 14,
  },
  emptyState: {
    minHeight: 180,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 10,
    color: MainColors.mutedText,
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

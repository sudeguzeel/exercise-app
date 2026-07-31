import { ExerciseCard } from "@/src/features/exercises/components/exercise-card";
import {
  buildCategoryFilters,
  buildExerciseList,
  filterExercises,
  type ExerciseListItem,
} from "@/src/features/exercises/exercise-catalog";
import { MainColors } from "@/shared/constants/theme";
import { getExerciseCatalog } from "@/shared/lib/services/homeService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  type ListRenderItem,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAGE_SIZE = 6;

export default function ExerciseScreen() {
  const catalog = useMemo(() => getExerciseCatalog(), []);
  const exerciseList = useMemo(
    () => buildExerciseList(catalog.exercises, catalog.categories),
    [catalog],
  );
  const categoryFilters = useMemo(
    () => buildCategoryFilters(catalog.categories),
    [catalog],
  );
  const [searchText, setSearchText] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const lastLoadRequestRef = useRef<number | null>(null);

  const filteredExercises = useMemo(
    () => filterExercises(exerciseList, searchText, selectedCategoryId),
    [exerciseList, searchText, selectedCategoryId],
  );
  const visibleExercises = useMemo(
    () => filteredExercises.slice(0, visibleCount),
    [filteredExercises, visibleCount],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    lastLoadRequestRef.current = null;
  }, [searchText, selectedCategoryId]);

  const handleExercisePress = useCallback((exercise: ExerciseListItem) => {
    router.push({
      pathname: "/exercise-detail",
      params: { exerciseId: exercise.id },
    });
  }, []);

  const handleEndReached = useCallback(() => {
    if (
      visibleCount >= filteredExercises.length ||
      lastLoadRequestRef.current === visibleCount
    ) {
      return;
    }

    lastLoadRequestRef.current = visibleCount;
    setVisibleCount((currentCount) =>
      Math.min(currentCount + PAGE_SIZE, filteredExercises.length),
    );
  }, [filteredExercises.length, visibleCount]);

  const renderExercise = useCallback<ListRenderItem<ExerciseListItem>>(
    ({ item }) => (
      <ExerciseCard exercise={item} onPress={handleExercisePress} />
    ),
    [handleExercisePress],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={visibleExercises}
        renderItem={renderExercise}
        keyExtractor={(exercise) => exercise.id}
        ItemSeparatorComponent={ExerciseSeparator}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.profileRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profil"
                accessibilityHint="Profil ekranı henüz mevcut değil"
                accessibilityState={{ disabled: true }}
                disabled
                style={styles.profileButton}
              >
                <Ionicons
                  name="person-outline"
                  size={25}
                  color={MainColors.text}
                />
              </Pressable>
            </View>

            <Text maxFontSizeMultiplier={1.3} style={styles.title}>
              Egzersizler
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
        }
        contentContainerStyle={styles.content}
        initialNumToRender={PAGE_SIZE}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={PAGE_SIZE}
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
});

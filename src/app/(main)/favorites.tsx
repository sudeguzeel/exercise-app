import { ExerciseCard } from "@/features/exercises/components/exercise-card";
import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
import { DataErrorState } from "@/shared/components/data-error-state";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { useFavorites } from "@/providers/FavoritesContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoritesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { favorites, status, refetchFavorites, toggleFavorite } =
    useFavorites();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    await refetchFavorites();
    setRetrying(false);
  }, [refetchFavorites]);

  const openExercise = useCallback((exercise: ExerciseListItem) => {
    router.push({
      pathname: "/exercise-detail",
      params: { exerciseId: exercise.id },
    });
  }, []);

  const renderFavorite = useCallback<ListRenderItem<ExerciseListItem>>(
    ({ item }) => (
      <ExerciseCard
        exercise={item}
        favorited
        onFavoritePress={toggleFavorite}
        onPress={openExercise}
      />
    ),
    [openExercise, toggleFavorite],
  );

  if (status === "error") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DataErrorState
          variant="service"
          description="Favorilerin yüklenirken bir hata oluştu. Lütfen daha sonra tekrar dene."
          errorCode="FIT-SERVICE-FAVORITES"
          onRetry={() => void handleRetry()}
          retrying={retrying}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Egzersizlere dön"
          onPress={() => router.replace("/exercise")}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Favoriler</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavorite}
          keyExtractor={(exercise) => exercise.id}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<EmptyFavorites />}
          contentContainerStyle={[
            styles.listContent,
            favorites.length === 0 && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyFavorites() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={72} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Henüz favori egzersizin yok</Text>
      <Text style={styles.emptyDescription}>
        Beğendiğin egzersizleri favoriye ekleyerek burada kolayca görüntüleyebilirsin.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/exercise")}
        style={({ pressed }) => [
          styles.discoverButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="search" size={21} color={colors.onPrimary} />
        <Text style={styles.discoverText}>Egzersizleri keşfet</Text>
      </Pressable>
    </View>
  );
}

function Separator() {
  const { colors } = useAppTheme();
  return <View style={[separatorBase, { backgroundColor: colors.borderSubtle }]} />;
}

const separatorBase = { height: 12 };

const createStyles = (colors: AppThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 76,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 48 },
  title: { color: colors.text, fontSize: 24, fontWeight: "900" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
  },
  listContent: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyListContent: { flexGrow: 1 },
  separator: { height: 14 },
  emptyState: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 28,
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyDescription: {
    maxWidth: 400,
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  discoverButton: {
    minHeight: 56,
    marginTop: 28,
    paddingHorizontal: 30,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  discoverText: { color: colors.onPrimary, fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

import { ExerciseCard } from "@/features/exercises/components/exercise-card";
import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
import { DataErrorState } from "@/shared/components/data-error-state";
import { MainColors } from "@/shared/constants/theme";
import { searchExercises } from "@/shared/lib/services/exerciseCatalogService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

type FavoritesState = "loading" | "success" | "error";

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<ExerciseListItem[]>([]);
  const [state, setState] = useState<FavoritesState>("loading");
  const [retrying, setRetrying] = useState(false);

  const loadFavoritesPreview = useCallback(async (retry = false) => {
    if (retry) setRetrying(true);
    else setState("loading");

    try {
      // Favori servisi hazır olana kadar katalogdan gelen bu kayıtlar yalnızca
      // ekran tasarımını göstermek için kullanılan geçici önizleme verisidir.
      const result = await searchExercises({ offset: 0, limit: 5 });
      setFavorites(result.items);
      setState("success");
    } catch {
      setState("error");
    } finally {
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    void loadFavoritesPreview();
  }, [loadFavoritesPreview]);

  const openExercise = useCallback((exercise: ExerciseListItem) => {
    router.push({
      pathname: "/exercise-detail",
      params: { exerciseId: exercise.id },
    });
  }, []);

  const removeFavorite = useCallback((exercise: ExerciseListItem) => {
    setFavorites((current) =>
      current.filter((favorite) => favorite.id !== exercise.id),
    );
  }, []);

  const renderFavorite = useCallback<ListRenderItem<ExerciseListItem>>(
    ({ item }) => (
      <ExerciseCard
        exercise={item}
        favorited
        onFavoritePress={removeFavorite}
        onPress={openExercise}
      />
    ),
    [openExercise, removeFavorite],
  );

  if (state === "error") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <DataErrorState
          variant="service"
          description="Favorilerin yüklenirken bir hata oluştu. Lütfen daha sonra tekrar dene."
          errorCode="FIT-SERVICE-FAVORITES"
          onRetry={() => void loadFavoritesPreview(true)}
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
          <Ionicons name="chevron-back" size={25} color={MainColors.text} />
        </Pressable>
        <Text style={styles.title}>Favoriler</Text>
        <View style={styles.headerSpacer} />
      </View>

      {state === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator color={MainColors.primary} size="large" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavorite}
          keyExtractor={(exercise) => exercise.id}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            favorites.length ? (
              <View style={styles.intro}>
                <Text style={styles.introText}>
                  Favori egzersizlerini görüntüle ve dilediğin zaman detaylarına göz at.
                </Text>
                <Text style={styles.previewNote}>
                  Bu liste favori altyapısı tamamlanana kadar geçici önizleme verisi gösterir.
                </Text>
              </View>
            ) : null
          }
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
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="heart-outline" size={72} color={MainColors.primary} />
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
        <Ionicons name="search" size={21} color="#FFFFFF" />
        <Text style={styles.discoverText}>Egzersizleri keşfet</Text>
      </Pressable>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
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
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: 48 },
  title: { color: MainColors.text, fontSize: 24, fontWeight: "900" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: {
    marginTop: 14,
    color: MainColors.mutedText,
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
  intro: { paddingTop: 4, paddingBottom: 22, alignItems: "center" },
  introText: {
    maxWidth: 440,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  previewNote: {
    marginTop: 8,
    color: MainColors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
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
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    marginTop: 28,
    color: MainColors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyDescription: {
    maxWidth: 400,
    marginTop: 10,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  discoverButton: {
    minHeight: 56,
    marginTop: 28,
    paddingHorizontal: 30,
    borderRadius: 18,
    backgroundColor: MainColors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  discoverText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});

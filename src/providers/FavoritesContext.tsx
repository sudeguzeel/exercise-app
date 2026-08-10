import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
import {
  addFavoriteExercise,
  listFavoriteExercises,
  removeFavoriteExercise,
} from "@/shared/lib/services/favoriteExerciseService";
import { supabase } from "@/shared/lib/supabase";
import { MainColors } from "@/shared/constants/theme";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, View } from "react-native";

export type FavoritesStatus = "loading" | "success" | "error";

type FavoritesContextValue = {
  favorites: ExerciseListItem[];
  status: FavoritesStatus;
  isFavorite: (exerciseId: string) => boolean;
  toggleFavorite: (exercise: ExerciseListItem) => void;
  refetchFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

const SNACKBAR_DURATION_MS = 2200;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<ExerciseListItem[]>([]);
  const [status, setStatus] = useState<FavoritesStatus>("loading");
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const favoritesRef = useRef<ExerciseListItem[]>([]);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(
    () => () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    },
    [],
  );

  const showSnackbar = useCallback((message: string) => {
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    setSnackbarMessage(message);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      snackbarTimerRef.current = null;
    }, SNACKBAR_DURATION_MS);
  }, []);

  const loadFavorites = useCallback(async () => {
    setStatus("loading");
    try {
      const items = await listFavoriteExercises();
      favoritesRef.current = items;
      setFavorites(items);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadFavorites();

    // Uygulama açılışında/oturum değişikliklerinde (giriş, çıkış, token
    // yenileme) favori listesini güncel tutar. FavoritesProvider tüm
    // navigasyon ağacının üzerinde tek sefer mount olduğu için (bkz.
    // src/app/_layout.tsx), login/logout sonrası yeniden yüklemenin tek
    // yolu bu event'i dinlemek.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          favoritesRef.current = [];
          setFavorites([]);
          setStatus("success");
          return;
        }
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          void loadFavorites();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (exerciseId: string) =>
      favorites.some((exercise) => exercise.id === exerciseId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (exercise: ExerciseListItem) => {
      const previousFavorites = favoritesRef.current;
      const alreadyFavorite = previousFavorites.some(
        (favorite) => favorite.id === exercise.id,
      );
      const nextFavorites = alreadyFavorite
        ? previousFavorites.filter((favorite) => favorite.id !== exercise.id)
        : [
            exercise,
            ...previousFavorites.filter(
              (favorite) => favorite.id !== exercise.id,
            ),
          ];

      // Optimistic update: sunucu yanıtını beklemeden UI'ı güncelle, istek
      // başarısız olursa önceki listeye geri dön.
      favoritesRef.current = nextFavorites;
      setFavorites(nextFavorites);
      showSnackbar(
        alreadyFavorite ? "Favorilerden çıkarıldı" : "Favorilere eklendi",
      );

      const persist = alreadyFavorite
        ? removeFavoriteExercise(exercise.id)
        : addFavoriteExercise(exercise.id);

      persist.catch(() => {
        favoritesRef.current = previousFavorites;
        setFavorites(previousFavorites);
        showSnackbar("Bir hata oluştu, tekrar deneyin");
      });
    },
    [showSnackbar],
  );

  const value = useMemo(
    () => ({
      favorites,
      status,
      isFavorite,
      toggleFavorite,
      refetchFavorites: loadFavorites,
    }),
    [favorites, isFavorite, loadFavorites, status, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      <View style={styles.providerContent}>{children}</View>
      {snackbarMessage ? (
        <View pointerEvents="none" style={styles.snackbarContainer}>
          <View style={styles.snackbar}>
            <Text maxFontSizeMultiplier={1.3} style={styles.snackbarText}>
              {snackbarMessage}
            </Text>
          </View>
        </View>
      ) : null}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside a FavoritesProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  providerContent: {
    flex: 1,
  },
  snackbarContainer: {
    position: "absolute",
    right: 20,
    bottom: 94,
    left: 20,
    alignItems: "center",
  },
  snackbar: {
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: MainColors.text,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  snackbarText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center",
  },
});

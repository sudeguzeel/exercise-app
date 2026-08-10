import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
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

type FavoritesContextValue = {
  favorites: ExerciseListItem[];
  isInitialized: boolean;
  initializeFavorites: (exercises: ExerciseListItem[]) => void;
  isFavorite: (exerciseId: string) => boolean;
  toggleFavorite: (exercise: ExerciseListItem) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

const SNACKBAR_DURATION_MS = 2200;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<ExerciseListItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const favoritesRef = useRef<ExerciseListItem[]>([]);
  const initializedRef = useRef(false);
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

  const initializeFavorites = useCallback((exercises: ExerciseListItem[]) => {
    if (initializedRef.current) return;

    const uniqueExercises = exercises.filter(
      (exercise, index, all) =>
        all.findIndex((candidate) => candidate.id === exercise.id) === index,
    );
    initializedRef.current = true;
    favoritesRef.current = uniqueExercises;
    setFavorites(uniqueExercises);
    setIsInitialized(true);
  }, []);

  const isFavorite = useCallback(
    (exerciseId: string) =>
      favorites.some((exercise) => exercise.id === exerciseId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (exercise: ExerciseListItem) => {
      const alreadyFavorite = favoritesRef.current.some(
        (favorite) => favorite.id === exercise.id,
      );
      const nextFavorites = alreadyFavorite
        ? favoritesRef.current.filter(
            (favorite) => favorite.id !== exercise.id,
          )
        : [
            exercise,
            ...favoritesRef.current.filter(
              (favorite) => favorite.id !== exercise.id,
            ),
          ];

      initializedRef.current = true;
      favoritesRef.current = nextFavorites;
      setIsInitialized(true);
      setFavorites(nextFavorites);
      showSnackbar(
        alreadyFavorite ? "Favorilerden çıkarıldı" : "Favorilere eklendi",
      );
    },
    [showSnackbar],
  );

  const value = useMemo(
    () => ({
      favorites,
      isInitialized,
      initializeFavorites,
      isFavorite,
      toggleFavorite,
    }),
    [favorites, initializeFavorites, isFavorite, isInitialized, toggleFavorite],
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

import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type ExerciseCardProps = {
  exercise: ExerciseListItem;
  favorited?: boolean;
  onFavoritePress?: (exercise: ExerciseListItem) => void;
  onPress: (exercise: ExerciseListItem) => void;
};

export function ExerciseCard({
  exercise,
  favorited = false,
  onFavoritePress,
  onPress,
}: ExerciseCardProps) {
  // Her kart kendi görsel yükleme hatasını takip eder — bir egzersizin
  // görseli 404 verirse yalnızca o kart ikon placeholder'a düşer.
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        exercise.level
          ? `${exercise.name}, ${exercise.bodyPartName}, ${exercise.level}`
          : `${exercise.name}, ${exercise.bodyPartName}`
      }
      onPress={() => onPress(exercise)}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.image}>
        {exercise.imageUrl && !imageFailed ? (
          <Image
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            source={{ uri: exercise.imageUrl }}
            style={styles.imagePhoto}
          />
        ) : (
          <Ionicons
            name={exercise.icon}
            size={38}
            color={MainColors.mutedText}
          />
        )}
      </View>

      <View style={styles.content}>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={2}
          style={styles.name}
        >
          {exercise.name}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={styles.meta}
        >
          {exercise.level
            ? `${exercise.bodyPartName} · ${exercise.level}`
            : exercise.bodyPartName}
        </Text>
      </View>

      {onFavoritePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favorited ? "Favorilerden çıkar" : "Favorilere ekle"
          }
          accessibilityState={{ selected: favorited }}
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress(exercise);
          }}
          style={({ pressed }) => [
            styles.favoriteButton,
            pressed && styles.favoriteButtonPressed,
          ]}
        >
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={27}
            color={favorited ? MainColors.primary : MainColors.mutedText}
          />
        </Pressable>
      ) : (
        <Ionicons
          name={favorited ? "heart" : "chevron-forward"}
          size={favorited ? 27 : 20}
          color={favorited ? MainColors.primary : MainColors.mutedText}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cardPressed: {
    opacity: 0.72,
  },
  image: {
    width: 82,
    height: 82,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 20,
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  imagePhoto: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  favoriteButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButtonPressed: {
    backgroundColor: MainColors.paleGreen,
  },
  name: {
    color: MainColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
  },
  meta: {
    marginTop: 4,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
});

import type { ExerciseListItem } from "@/features/exercises/exercise-catalog";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ExerciseCardProps = {
  exercise: ExerciseListItem;
  onPress: (exercise: ExerciseListItem) => void;
};

export function ExerciseCard({ exercise, onPress }: ExerciseCardProps) {
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
        <Ionicons
          name={exercise.icon}
          size={38}
          color={MainColors.mutedText}
        />
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

      <Ionicons
        name="chevron-forward"
        size={20}
        color={MainColors.mutedText}
      />
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
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
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

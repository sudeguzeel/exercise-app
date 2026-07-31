import {
  getExerciseById,
  getExerciseCategoryName,
} from "@/shared/lib/services/homeService";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{
    exerciseId?: string | string[];
  }>();
  const normalizedId = Array.isArray(exerciseId) ? exerciseId[0] : exerciseId;
  const exercise = normalizedId ? getExerciseById(normalizedId) : undefined;
  const categoryName = exercise
    ? getExerciseCategoryName(exercise.categoryId)
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Egzersizlere geri dön"
          accessibilityRole="button"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color="#171A18" />
        </Pressable>

        <View style={styles.card}>
          {exercise ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons
                  name={exercise.image}
                  size={34}
                  color={MainColors.primary}
                />
              </View>
              <Text style={styles.title}>{exercise.name}</Text>
              <Text style={styles.categoryLabel}>KATEGORİ</Text>
              <Text style={styles.category}>
                {categoryName ?? exercise.categoryId}
              </Text>
              <Text style={styles.level}>{exercise.level}</Text>
              <Text style={styles.description}>{exercise.description}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Egzersiz bulunamadı</Text>
              <Text style={styles.description}>
                İstenen egzersiz kaydı mevcut değil.
              </Text>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: MainColors.background },
  container: { flex: 1, padding: 20 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: MainColors.subtleBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MainColors.surface,
  },
  card: {
    marginTop: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: MainColors.subtleBorder,
    borderRadius: 22,
    backgroundColor: MainColors.surface,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: MainColors.paleGreen,
  },
  title: {
    marginTop: 18,
    color: MainColors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  categoryLabel: {
    marginTop: 24,
    color: MainColors.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  category: {
    marginTop: 5,
    color: MainColors.primary,
    fontSize: 16,
    fontWeight: "800",
  },
  level: {
    marginTop: 6,
    color: MainColors.mutedText,
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    marginTop: 18,
    color: MainColors.mutedText,
    fontSize: 15,
    lineHeight: 23,
  },
});

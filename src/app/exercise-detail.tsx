import {
  getExerciseById,
  getExerciseCategoryName,
} from "@/shared/lib/services/homeService";
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
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#171A18" />
        </Pressable>

        <View style={styles.card}>
          {exercise ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="barbell-outline" size={34} color="#62B900" />
              </View>
              <Text style={styles.title}>{exercise.name}</Text>
              <Text style={styles.categoryLabel}>KATEGORİ</Text>
              <Text style={styles.category}>
                {categoryName ?? exercise.categoryId}
              </Text>
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
  safeArea: { flex: 1, backgroundColor: "#FAFAF8" },
  container: { flex: 1, padding: 20 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#DDE0DA",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  card: {
    marginTop: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E1E3DF",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F6E8",
  },
  title: {
    marginTop: 18,
    color: "#171A18",
    fontSize: 26,
    fontWeight: "900",
  },
  categoryLabel: {
    marginTop: 24,
    color: "#747774",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  category: {
    marginTop: 5,
    color: "#62B900",
    fontSize: 16,
    fontWeight: "800",
  },
  description: {
    marginTop: 18,
    color: "#5F635F",
    fontSize: 15,
    lineHeight: 23,
  },
});

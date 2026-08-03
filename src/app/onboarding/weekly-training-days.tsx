import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { TrainingDay, useOnboarding } from "@/providers/OnboardingContext";
import { saveWeeklyTrainingDays } from "@/shared/lib/services/weeklyTrainingDaysService";

const GREEN = "#79DE2D";
const BACKGROUND = "#F7F8F2";
const BORDER = "#BFDDA9";
const TEXT = "#1C1C1C";
const MUTED = "#666A64";

type DayOption = {
  id: TrainingDay;
  label: string;
};

const dayOptions: DayOption[] = [
  { id: "monday", label: "Pzt" },
  { id: "tuesday", label: "Sal" },
  { id: "wednesday", label: "Çar" },
  { id: "thursday", label: "Per" },
  { id: "friday", label: "Cum" },
  { id: "saturday", label: "Cmt" },
  { id: "sunday", label: "Paz" },
];

export default function WeeklyTrainingDaysScreen() {
  const { trainingDays, setTrainingDays } = useOnboarding();

  const [isCreating, setIsCreating] = useState(false);
  const [saveError, setSaveError] = useState("");

  const isButtonEnabled = trainingDays.length > 0 && !isCreating;

  const toggleDay = (day: TrainingDay) => {
    setTrainingDays((previous) => {
      if (previous.includes(day)) {
        return previous.filter((selectedDay) => selectedDay !== day);
      }

      return [...previous, day];
    });
  };

  const handleCreateProgram = async () => {
    if (!isButtonEnabled) {
      return;
    }

    setIsCreating(true);
    setSaveError("");

    try {
      const result = await saveWeeklyTrainingDays(trainingDays);

      if (!result.success) {
        setSaveError(result.message);
        return;
      }

      // Tamamlandı mesajı gösterilmeden ana sayfaya geçilir.
      router.replace("/(main)");
    } catch {
      setSaveError("Bağlantı sağlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={TEXT} />
          </Pressable>

          <Text style={styles.stepText}>
            Adım <Text style={styles.activeStep}>4</Text> / 4
          </Text>
        </View>

        <View style={styles.progressRow}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View
              key={index}
              style={[styles.progressItem, styles.progressActive]}
            />
          ))}
        </View>

        <Text style={styles.title}>
          Haftalık hedefini{"\n"}
          belirle
        </Text>

        <Text style={styles.subtitle}>
          Antrenman yapmayı planladığın günleri seç. Bu günlerde antrenmanı
          tamamlarsan günlük serini korursun.
        </Text>

        <Text style={styles.sectionLabel}>ANTRENMAN GÜNLERİ</Text>

        <View style={styles.daysContainer}>
          {dayOptions.map((day) => {
            const selected = trainingDays.includes(day.id);

            return (
              <Pressable
                key={day.id}
                disabled={isCreating}
                onPress={() => toggleDay(day.id)}
                style={[styles.dayButton, selected && styles.dayButtonSelected]}
              >
                <Text
                  style={[styles.dayText, selected && styles.dayTextSelected]}
                >
                  {day.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Haftalık hedef</Text>

            <Text style={styles.goalCount}>
              {trainingDays.length} {trainingDays.length === 1 ? "gün" : "gün"}
            </Text>
          </View>

          <Text style={styles.goalDescription}>
            Seçtiğin her hedef gününde uygulamaya girip antrenmanı tamamlarsan
            serini kazanırsın.
          </Text>
        </View>

        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}

        <View style={styles.buttonArea}>
          <Pressable
            disabled={!isButtonEnabled}
            onPress={handleCreateProgram}
            style={[
              styles.createButton,
              !isButtonEnabled && styles.createButtonDisabled,
            ]}
          >
            {isCreating ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text style={styles.createButtonText}>Programımı oluştur</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    flexGrow: 1,
    paddingTop: Platform.OS === "ios" ? 18 : 24,
    paddingHorizontal: 16,
    paddingBottom: 46,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  stepText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "500",
  },
  activeStep: {
    color: GREEN,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    marginBottom: 46,
  },
  progressItem: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
  progressActive: {
    backgroundColor: GREEN,
  },
  title: {
    fontSize: 23,
    lineHeight: 27,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 7,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
    marginBottom: 25,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#676B65",
    marginBottom: 9,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayButton: {
    width: "22%",
    height: 54,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  dayText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: "700",
  },
  dayTextSelected: {
    color: "#111111",
  },
  goalCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT,
  },
  goalCount: {
    fontSize: 14,
    fontWeight: "800",
    color: GREEN,
  },
  goalDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
  },
  buttonArea: {
    marginTop: "auto",
    paddingTop: 24,
  },
  createButton: {
    height: 49,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 5,
  },
  createButtonDisabled: {
    backgroundColor: "#D6D9D1",
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#101010",
  },
  errorText: {
    marginTop: 14,
    color: "#D94B4B",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
});

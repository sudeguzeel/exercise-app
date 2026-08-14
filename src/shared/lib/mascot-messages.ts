export function getHomeMascotMessage(input: {
  isRestDay: boolean;
  todayExerciseStatuses: readonly ("completed" | "not_started")[];
  weeklyTotal: number;
  streakDays: number;
}) {
  const hasTodayWorkout = input.todayExerciseStatuses.length > 0;
  const isTodayCompleted =
    hasTodayWorkout &&
    input.todayExerciseStatuses.every((status) => status === "completed");

  if (isTodayCompleted) return "Bugünün antrenmanı tamam! 🎉";
  if (input.isRestDay) return "Bugün dinlenme günü 🌿";
  if (hasTodayWorkout) return "Bugünkü antrenmanın seni bekliyor! 💪";
  if (input.weeklyTotal === 0 && input.streakDays === 0) return "Hoş geldin! 👋";
  return "Bugün kendine biraz zaman ayır.";
}

export function getProgressMascotMessage(input: {
  currentWeightKg: number | null;
  updatedAt: string | null;
}) {
  return input.currentWeightKg === null && input.updatedAt === null
    ? "İlk ölçümünle başlayalım 🌱"
    : "Değişim zaman ister 🌱";
}

export function getWorkoutMascotMessage(input: {
  exerciseIndex: number;
  exerciseCount: number;
  setIndex: number;
  setCount: number;
}) {
  const isLastExercise = input.exerciseIndex === input.exerciseCount - 1;
  const isLastSet = input.setIndex >= 0 && input.setIndex === input.setCount - 1;

  if (isLastExercise && isLastSet) return "Son set! 💪";
  if (isLastSet) return "Bu hareketin son seti!";
  if (isLastExercise) return "Son harekete geldin! 🔥";
  if (input.exerciseIndex === 0 && input.setIndex === 0) {
    return "Hazırsan başlayalım! 💪";
  }
  return "Kendi temponda devam et.";
}

export function getRestMascotMessage(input: {
  durationSeconds: number;
  remainingSeconds: number;
}) {
  if (input.remainingSeconds <= 10) return "Hazırlan, başlıyoruz! 💪";
  const duration = Math.max(1, input.durationSeconds);
  const remainingRatio = input.remainingSeconds / duration;
  if (remainingRatio >= 0.6) return "Biraz nefeslen 😌";
  return "Enerjini topla.";
}

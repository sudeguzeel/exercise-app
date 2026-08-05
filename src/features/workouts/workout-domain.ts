import type { TrainingDay } from "@/providers/OnboardingContext";
import type { WorkoutSession, WorkoutSetPosition } from "@/features/workouts/types";

const DAY_BY_JS_INDEX: TrainingDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function isValidLocalDateKey(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function getTrainingDayForDateKey(dateKey: string): TrainingDay | null {
  if (!isValidLocalDateKey(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  return DAY_BY_JS_INDEX[new Date(year, month - 1, day, 12).getDay()];
}

export function findFirstIncompleteSet(
  session: WorkoutSession,
): WorkoutSetPosition | null {
  for (const [exerciseIndex, exercise] of session.exercises.entries()) {
    const setIndex = exercise.sets.findIndex((set) => !set.completedAt);
    if (setIndex >= 0) {
      return {
        exerciseIndex,
        setIndex,
        exercise,
        set: exercise.sets[setIndex],
      };
    }
  }
  return null;
}

export function findSetPosition(
  session: WorkoutSession,
  setId: string,
): WorkoutSetPosition | null {
  for (const [exerciseIndex, exercise] of session.exercises.entries()) {
    const setIndex = exercise.sets.findIndex((set) => set.id === setId);
    if (setIndex >= 0) {
      return { exerciseIndex, setIndex, exercise, set: exercise.sets[setIndex] };
    }
  }
  return null;
}

export function areAllSetsCompleted(session: WorkoutSession) {
  return (
    session.exercises.length > 0 &&
    session.exercises.every(
      (exercise) =>
        exercise.sets.length > 0 && exercise.sets.every((set) => set.completedAt),
    )
  );
}

export function clampReps(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export type WeightValidationResult =
  | { success: true; value: number }
  | { success: false; message: string };

export function validateWeightInput(rawValue: string): WeightValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { success: false, message: "Kullandığınız ağırlığı girin." };
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return { success: false, message: "Geçerli bir ağırlık girin." };
  }
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) {
    return { success: false, message: "Ağırlık sıfır veya daha büyük olmalıdır." };
  }
  return { success: true, value };
}

export function getElapsedDurationMs(session: WorkoutSession, now = Date.now()) {
  const resumedAt = session.lastResumedAt
    ? new Date(session.lastResumedAt).getTime()
    : Number.NaN;
  const runningDuration = Number.isFinite(resumedAt)
    ? Math.max(0, now - resumedAt)
    : 0;
  return Math.max(0, session.accumulatedDurationMs + runningDuration);
}

export function formatElapsedDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatCompletionDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} dk ${seconds > 0 ? `${seconds} sn` : ""}`.trim() : `${seconds} sn`;
}

import type { TrainingDay } from "@/providers/OnboardingContext";
import {
  clampRestSeconds,
  DEFAULT_PROGRAM_EXERCISE_REST_SECONDS,
  MAX_PROGRAM_EXERCISE_REST_SECONDS,
  resolveProgramExerciseRestSeconds,
} from "@/features/exercises/program-exercise-rest";
import type {
  PendingWorkoutTarget,
  WorkoutExerciseSnapshot,
  WorkoutSession,
  WorkoutSetPosition,
} from "@/features/workouts/types";

export const DEFAULT_REST_SECONDS = DEFAULT_PROGRAM_EXERCISE_REST_SECONDS;
export const MAX_REST_SECONDS = MAX_PROGRAM_EXERCISE_REST_SECONDS;
export { clampRestSeconds };

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

// Bir hareketin kendi içindeki ilk tamamlanmamış seti — setler her zaman
// kendi hareketi içinde sırayla tamamlanır, ama hareketler arasında serbestçe
// geçilebilir (bkz. workout.tsx'teki kaydırmalı hareket seçici).
export function findFirstIncompleteSetIndexInExercise(
  exercise: WorkoutExerciseSnapshot,
): number {
  return exercise.sets.findIndex((set) => !set.completedAt);
}

// Gerçek zamanda (completedAt'e göre) en son tamamlanan set — kullanıcı
// hareketler arasında serbestçe geçebildiği için "son tamamlanan" artık
// dizideki son eleman olmak zorunda değil (bkz. goBackOneStep /
// revertLastCompletedSet).
export function findMostRecentlyCompletedPosition(
  session: WorkoutSession,
): WorkoutSetPosition | null {
  let best: WorkoutSetPosition | null = null;
  for (const [exerciseIndex, exercise] of session.exercises.entries()) {
    for (const [setIndex, set] of exercise.sets.entries()) {
      if (!set.completedAt) continue;
      if (!best || set.completedAt > (best.set.completedAt as string)) {
        best = { exerciseIndex, setIndex, exercise, set };
      }
    }
  }
  return best;
}

// workout.tsx bir antrenman ekranını (yeniden) açtığında hangi hareketi
// göstereceğine karar verir: kullanıcı en son hangi harekette çalışıyorsa
// (ve o hareketin hâlâ bitmemiş seti varsa) oraya devam eder; değilse ilk
// tamamlanmamış harekete düşer. Kullanıcı daha sonra serbestçe kaydırarak
// başka bir harekete geçebilir.
export function resolveDefaultExerciseIndex(
  session: WorkoutSession,
): number | null {
  if (session.lastCompletedSetId) {
    const lastPosition = findSetPosition(session, session.lastCompletedSetId);
    if (
      lastPosition &&
      findFirstIncompleteSetIndexInExercise(lastPosition.exercise) >= 0
    ) {
      return lastPosition.exerciseIndex;
    }
  }
  const firstIncomplete = findFirstIncompleteSet(session);
  return firstIncomplete ? firstIncomplete.exerciseIndex : null;
}

export function isWorkoutExerciseCompleted(
  exercise: WorkoutExerciseSnapshot,
) {
  return (
    Number.isInteger(exercise.targetSets) &&
    exercise.targetSets > 0 &&
    exercise.sets.length === exercise.targetSets &&
    exercise.sets.every((set) => Boolean(set.completedAt))
  );
}

export function getWorkoutProgress(
  exercises: readonly WorkoutExerciseSnapshot[],
) {
  const totalExerciseCount = exercises.length;
  const hasValidExerciseStructure =
    totalExerciseCount > 0 &&
    exercises.every(
      (exercise) =>
        Number.isInteger(exercise.targetSets) &&
        exercise.targetSets > 0 &&
        exercise.sets.length === exercise.targetSets,
    );
  const requiredSetCount = hasValidExerciseStructure
    ? exercises.reduce((total, exercise) => total + exercise.targetSets, 0)
    : 0;
  const completedSetCount = exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => Boolean(set.completedAt)).length,
    0,
  );
  const completedExerciseCount = exercises.filter(
    isWorkoutExerciseCompleted,
  ).length;
  const percentage =
    totalExerciseCount === 0
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            Math.round((completedExerciseCount / totalExerciseCount) * 100),
          ),
        );

  const canFinalize =
    hasValidExerciseStructure &&
    requiredSetCount > 0 &&
    completedSetCount === requiredSetCount &&
    completedExerciseCount === totalExerciseCount &&
    percentage === 100;

  return {
    completedSetCount,
    requiredSetCount,
    completedExerciseCount,
    totalExerciseCount,
    percentage,
    canFinalize,
    isComplete: canFinalize,
  };
}

export function areAllSetsCompleted(session: WorkoutSession) {
  return getWorkoutProgress(session.exercises).isComplete;
}

export function createWorkoutOccurrenceKey({
  userId,
  programId,
  workoutDate,
}: {
  userId: string;
  programId: string;
  workoutDate: string;
}) {
  return `${userId}:${programId}:${workoutDate}`;
}

export function toLocalDateKey(date: Date) {
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateKeyFromTimestamp(
  value: string | null | undefined,
) {
  if (!value) return null;
  return toLocalDateKey(new Date(value));
}

export function toPendingWorkoutTarget(
  position: WorkoutSetPosition,
): PendingWorkoutTarget {
  return {
    exerciseIndex: position.exerciseIndex,
    setIndex: position.setIndex,
    setId: position.set.id,
  };
}

export function findPendingWorkoutTarget(
  session: WorkoutSession,
): WorkoutSetPosition | null {
  const target = session.pendingTarget;
  if (!target) return null;
  const exercise = session.exercises[target.exerciseIndex];
  const set = exercise?.sets[target.setIndex];
  if (!exercise || !set || set.id !== target.setId || set.completedAt) return null;
  return {
    exerciseIndex: target.exerciseIndex,
    setIndex: target.setIndex,
    exercise,
    set,
  };
}

export function resolveRestDurationSeconds(value: number | null | undefined) {
  return resolveProgramExerciseRestSeconds({
    customRestSeconds: value,
    recommendedRestSeconds: null,
  });
}

export function getRestRemainingSeconds(
  restEndsAt: string | null,
  now = Date.now(),
) {
  if (!restEndsAt) return 0;
  const endTimestamp = new Date(restEndsAt).getTime();
  if (!Number.isFinite(endTimestamp)) return 0;
  return clampRestSeconds(Math.ceil((endTimestamp - now) / 1000));
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
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} sa${minutes > 0 ? ` ${minutes} dk` : ""}`;
  }
  return totalMinutes > 0
    ? `${totalMinutes} dk${seconds > 0 ? ` ${seconds} sn` : ""}`
    : `${seconds} sn`;
}

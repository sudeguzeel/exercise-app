import {
  calculateWorkoutStreaks,
  countScheduledTrainingDays,
  countScheduledWorkouts,
  filterCompletedWorkoutsByPeriod,
  getLatestCompletedWeights,
  getPeriodLabel,
} from "@/features/progress/progress-domain";
import {
  listWorkingWeights,
  loadBodyProgress,
} from "@/features/progress/progress-storage";
import type {
  ExerciseWeightItem,
  ProgressDashboard,
  ProgressPeriod,
} from "@/features/progress/types";
import { programRepository } from "@/features/programs/program-repository";
import { workoutRepository } from "@/features/workouts/workout-repository";
import { getExerciseDetail } from "@/shared/lib/services/exerciseCatalogService";

export async function loadExerciseWeightItems(): Promise<ExerciseWeightItem[]> {
  const [programs, weights, completions] = await Promise.all([
    programRepository.listPrograms(),
    listWorkingWeights(),
    workoutRepository.listCompletions(),
  ]);
  const weightsByProgramExercise = new Map(
    weights.map((weight) => [weight.programExerciseId, weight]),
  );
  const completedWeightsByProgramExercise =
    getLatestCompletedWeights(completions);
  const candidates = programs.flatMap((program) =>
    program.exercises.map((exercise) => ({ program, exercise })),
  );
  const detailByExerciseId = new Map<
    string,
    Awaited<ReturnType<typeof getExerciseDetail>>
  >();
  await Promise.all(
    [...new Set(candidates.map(({ exercise }) => exercise.exerciseId))].map(
      async (exerciseId) => {
        const detail = await getExerciseDetail(exerciseId).catch(() => null);
        detailByExerciseId.set(exerciseId, detail);
      },
    ),
  );

  return candidates
    // "Hareket Ağırlıkların" sadece harici ağırlıkla yapılan egzersizleri
    // (barbell/dumbbell/kettlebell/cable vb. — bkz. equipments.is_weight_based)
    // listelemeli; body weight, band, kardiyo makinesi gibi ekipmanlarda
    // "kaç kg" sorusu anlamsız.
    .filter(({ exercise }) => detailByExerciseId.get(exercise.exerciseId)?.isWeightBased)
    .map(({ program, exercise }) => {
      const stored = weightsByProgramExercise.get(exercise.id);
      const completedFallback = completedWeightsByProgramExercise.get(exercise.id);
      const detail = detailByExerciseId.get(exercise.exerciseId);
      const resolvedWeight = stored ?? completedFallback;
      return {
        userId: resolvedWeight?.userId ?? "",
        programExerciseId: exercise.id,
        exerciseId: exercise.exerciseId,
        programId: program.id,
        programName: program.name,
        exerciseName: exercise.name,
        muscleGroupName: detail?.bodyPartName ?? null,
        sets: exercise.sets,
        reps: exercise.reps,
        weightKg: resolvedWeight?.weightKg ?? 0,
        previousWeightKg: resolvedWeight?.previousWeightKg ?? null,
        updatedAt:
          stored?.updatedAt ?? completedFallback?.completedAt ?? "",
        hasWeightRecord: Boolean(resolvedWeight),
        weightSource: stored
          ? "stored"
          : completedFallback
            ? "completed-set"
            : null,
      } satisfies ExerciseWeightItem;
    })
    .sort((left, right) => {
      if (left.updatedAt !== right.updatedAt) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      return left.exerciseName.localeCompare(right.exerciseName, "tr-TR");
    });
}

export async function loadProgressDashboard(
  period: ProgressPeriod,
  referenceDate = new Date(),
): Promise<ProgressDashboard> {
  const [programs, completions, exerciseWeights, bodyProgress] =
    await Promise.all([
      programRepository.listPrograms(),
      workoutRepository.listCompletions(),
      loadExerciseWeightItems(),
      loadBodyProgress(),
    ]);
  const history = filterCompletedWorkoutsByPeriod(
    completions,
    period,
    referenceDate,
  );
  const { currentStreak, longestStreak } = calculateWorkoutStreaks(
    completions,
    referenceDate,
  );

  return {
    period,
    periodLabel: getPeriodLabel(period),
    totalCompletedCount: completions.length,
    periodCompletedCount: history.length,
    periodTargetCount: countScheduledWorkouts(programs, period, referenceDate),
    periodTargetDayCount: countScheduledTrainingDays(programs, period, referenceDate),
    currentStreak,
    longestStreak,
    exerciseWeights: exerciseWeights.filter((item) => item.hasWeightRecord),
    bodyProgress,
    history,
  };
}

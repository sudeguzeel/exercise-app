import type { PersistedProgramExercise } from "@/features/programs/types";
import type { WorkoutCompletion } from "@/features/workouts/types";

export type ProgressPeriod = "week" | "month" | "year";

export type WorkingWeightRecord = {
  userId: string;
  programExerciseId: string;
  exerciseId: string;
  weightKg: number;
  previousWeightKg: number | null;
  updatedAt: string;
};

export type BodyMeasurementRecord = {
  id: string;
  userId: string;
  weightKg: number;
  bodyFatPercentage: number;
  musclePercentage: number;
  recordedAt: string;
};

export type BodyProgress = {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  startingWeightKg: number | null;
  bodyFatPercentage: number | null;
  musclePercentage: number | null;
  updatedAt: string | null;
};

export type ExerciseWeightItem = WorkingWeightRecord & {
  programId: string;
  programName: string;
  exerciseName: string;
  muscleGroupName: string | null;
  sets: number;
  reps: number;
  hasWeightRecord: boolean;
  weightSource: "stored" | "completed-set" | null;
};

export type ExerciseWeightCandidate = {
  programId: string;
  programName: string;
  exercise: PersistedProgramExercise;
};

export type ProgressDashboard = {
  period: ProgressPeriod;
  periodLabel: string;
  totalCompletedCount: number;
  periodCompletedCount: number;
  periodTargetCount: number;
  currentStreak: number;
  longestStreak: number;
  exerciseWeights: ExerciseWeightItem[];
  bodyProgress: BodyProgress;
  history: WorkoutCompletion[];
};

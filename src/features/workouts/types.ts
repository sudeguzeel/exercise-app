import type { TrainingDay } from "@/providers/OnboardingContext";

export type WorkoutSessionStatus =
  | "active"
  | "paused"
  | "completing"
  | "completed";

export type WorkoutSetSnapshot = {
  id: string;
  setNumber: number;
  targetReps: number;
  actualReps: number;
  weightInput: string;
  weightKg: number | null;
  completedAt: string | null;
};

export type WorkoutExerciseSnapshot = {
  programExerciseId: string;
  exerciseId: string;
  orderIndex: number;
  name: string;
  muscleGroupName: string | null;
  mediaUrl: string | null;
  mediaType: "gif" | null;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  sets: WorkoutSetSnapshot[];
};

export type WorkoutSession = {
  id: string;
  userId: string;
  programId: string;
  programName: string;
  programTrainingDays: TrainingDay[];
  workoutDate: string;
  exercises: WorkoutExerciseSnapshot[];
  status: WorkoutSessionStatus;
  startedAt: string;
  lastResumedAt: string | null;
  accumulatedDurationMs: number;
  completedAt: string | null;
};

export type WorkoutCompletion = {
  id: string;
  workoutSessionId: string;
  userId: string;
  programId: string;
  programName: string;
  workoutDate: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  completedExerciseCount: number;
  exercises: WorkoutExerciseSnapshot[];
  plannedDay: boolean;
  currentStreak: number;
  status: "completed";
};

export type WorkoutSetPosition = {
  exerciseIndex: number;
  setIndex: number;
  exercise: WorkoutExerciseSnapshot;
  set: WorkoutSetSnapshot;
};

export type CompleteSetInput = {
  workoutSessionId: string;
  setId: string;
  actualReps: number;
  weightKg: number;
};

export type LocalCompletedExerciseRecord = {
  exerciseId: string;
  programExerciseId: string;
  workoutDate: string;
};

export type WorkoutRepository = {
  startOrResumeSession: (
    programId: string,
    workoutDate: string,
  ) => Promise<WorkoutSession>;
  getSession: (workoutSessionId: string) => Promise<WorkoutSession | null>;
  resumeSession: (workoutSessionId: string) => Promise<WorkoutSession>;
  pauseSession: (workoutSessionId: string) => Promise<WorkoutSession>;
  updateSetDraft: (
    workoutSessionId: string,
    setId: string,
    draft: { actualReps: number; weightInput: string },
  ) => Promise<WorkoutSession>;
  completeSet: (input: CompleteSetInput) => Promise<WorkoutSession>;
  completeWorkout: (workoutSessionId: string) => Promise<WorkoutCompletion>;
  getCompletion: (workoutSessionId: string) => Promise<WorkoutCompletion | null>;
  getLocalCompletedExerciseRecords: (
    fromDate?: string,
    toDate?: string,
  ) => Promise<LocalCompletedExerciseRecord[]>;
};

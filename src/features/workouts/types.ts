import type { TrainingDay } from "@/providers/OnboardingContext";

export type WorkoutSessionStatus =
  | "active"
  | "paused"
  | "completing"
  | "completed";

export type WorkoutPhase = "active" | "rest" | "saving" | "completed";

export type PendingWorkoutTarget = {
  exerciseIndex: number;
  setIndex: number;
  setId: string;
};

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
  phase: WorkoutPhase;
  pendingTarget: PendingWorkoutTarget | null;
  restStartedAt: string | null;
  restEndsAt: string | null;
  restDurationSeconds: number | null;
  lastCompletedSetId: string | null;
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
  completedDate: string;
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
};

export type LocalCompletedExerciseRecord = {
  exerciseId: string;
  programExerciseId: string;
  programId: string;
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
  revertLastCompletedSet: (workoutSessionId: string) => Promise<WorkoutSession>;
  completeSet: (input: CompleteSetInput) => Promise<WorkoutSession>;
  extendRest: (
    workoutSessionId: string,
    seconds?: number,
  ) => Promise<WorkoutSession>;
  finishRest: (workoutSessionId: string) => Promise<WorkoutSession>;
  completeWorkout: (workoutSessionId: string) => Promise<WorkoutCompletion>;
  getCompletion: (workoutSessionId: string) => Promise<WorkoutCompletion | null>;
  getCompletionForProgramDate: (
    programId: string,
    workoutDate: string,
  ) => Promise<WorkoutCompletion | null>;
  resetCompletedSession: (
    programId: string,
    workoutDate: string,
  ) => Promise<void>;
  getLocalCompletedExerciseRecords: (
    fromDate?: string,
    toDate?: string,
  ) => Promise<LocalCompletedExerciseRecord[]>;
};

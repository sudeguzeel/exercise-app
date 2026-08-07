import type { TrainingDay } from "@/providers/OnboardingContext";
import type { ProgramSelectionPayload } from "@/features/exercises/program-selection";

export type ProgramExercise = ProgramSelectionPayload;

// user_workout_program_exercises satırına yazıldıktan sonra DB'nin ürettiği id.
export type PersistedProgramExercise = ProgramExercise & {
  id: string;
  name: string;
  orderIndex: number;
  restSecondsOrigin?: "stored" | "fallback";
};

export type UserProgram = {
  id: string;
  name: string;
  trainingDays: TrainingDay[];
  muscleGroupIds: string[];
  exercises: PersistedProgramExercise[];
};

export type AddExerciseStatus = "added" | "alreadyExists" | "failed";

export type AddExerciseResultItem = {
  programId: string;
  programName: string;
  status: AddExerciseStatus;
};

export type AddExerciseToProgramsResult = {
  results: AddExerciseResultItem[];
};

export type CreateProgramWithExerciseInput = {
  name: string;
  trainingDays: TrainingDay[];
  muscleGroupIds: string[];
  exercise: ProgramExercise;
};

export type UpdateProgramInput = {
  id: string;
  name: string;
  trainingDays: TrainingDay[];
  muscleGroupIds: string[];
  exercises: PersistedProgramExercise[];
};

export type ProgramRepository = {
  listPrograms: () => Promise<UserProgram[]>;
  getProgramById: (programId: string) => Promise<UserProgram | null>;
  addExerciseToPrograms: (
    programIds: string[],
    exercise: ProgramExercise,
  ) => Promise<AddExerciseToProgramsResult>;
  createProgramWithExercise: (
    input: CreateProgramWithExerciseInput,
  ) => Promise<UserProgram>;
  updateProgram: (input: UpdateProgramInput) => Promise<UserProgram>;
  deleteProgram: (programId: string) => Promise<void>;
};


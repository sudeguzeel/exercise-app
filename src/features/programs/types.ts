import type { TrainingDay } from "@/providers/OnboardingContext";
import type { ProgramSelectionPayload } from "@/src/features/exercises/program-selection";

export type ProgramExercise = ProgramSelectionPayload;

export type UserProgram = {
  id: string;
  name: string;
  trainingDays: TrainingDay[];
  muscleGroupIds: string[];
  exercises: ProgramExercise[];
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

export type ProgramRepository = {
  listPrograms: () => Promise<UserProgram[]>;
  addExerciseToPrograms: (
    programIds: string[],
    exercise: ProgramExercise,
  ) => Promise<AddExerciseToProgramsResult>;
  createProgramWithExercise: (
    input: CreateProgramWithExerciseInput,
  ) => Promise<UserProgram>;
};


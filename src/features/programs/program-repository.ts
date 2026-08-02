import type { TrainingDay } from "@/providers/OnboardingContext";
import { supabase } from "@/shared/lib/supabase";
import type {
  AddExerciseResultItem,
  AddExerciseToProgramsResult,
  CreateProgramWithExerciseInput,
  PersistedProgramExercise,
  ProgramExercise,
  ProgramRepository,
  UserProgram,
} from "@/features/programs/types";

export type ProgramRepositoryErrorCode =
  | "AUTH_REQUIRED"
  | "DUPLICATE_NAME"
  | "INVALID_INPUT"
  | "REQUEST_FAILED";

export class ProgramRepositoryError extends Error {
  constructor(
    public readonly code: ProgramRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProgramRepositoryError";
  }
}

const DAY_CODE_MAP: Record<TrainingDay, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

const DAY_FROM_CODE: Record<string, TrainingDay> = Object.fromEntries(
  Object.entries(DAY_CODE_MAP).map(([day, code]) => [code, day as TrainingDay]),
);

function toDayCodes(days: TrainingDay[]): string[] {
  return days.map((day) => DAY_CODE_MAP[day]);
}

function fromDayCodes(codes: string[] | null | undefined): TrainingDay[] {
  return (codes ?? [])
    .map((code) => DAY_FROM_CODE[code])
    .filter((day): day is TrainingDay => Boolean(day));
}

type ProgramExerciseRow = {
  id: string;
  exercise_id: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  order_index: number;
};

type ProgramRow = {
  id: string;
  name: string;
  training_days: string[] | null;
  muscle_group_ids: string[] | null;
  user_workout_program_exercises: ProgramExerciseRow[] | null;
};

function toPersistedExercise(row: ProgramExerciseRow): PersistedProgramExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    sets: row.sets,
    reps: row.reps,
    restSeconds: row.rest_seconds,
  };
}

function mapProgramRow(row: ProgramRow): UserProgram {
  return {
    id: row.id,
    name: row.name,
    trainingDays: fromDayCodes(row.training_days),
    muscleGroupIds: row.muscle_group_ids ?? [],
    exercises: (row.user_workout_program_exercises ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(toPersistedExercise),
  };
}

function sortResultsByRequestOrder(
  results: AddExerciseResultItem[],
  programIds: string[],
) {
  const order = new Map(programIds.map((id, index) => [id, index]));
  return [...results].sort(
    (left, right) =>
      (order.get(left.programId) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.programId) ?? Number.MAX_SAFE_INTEGER),
  );
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ProgramRepositoryError("AUTH_REQUIRED", "Oturum bulunamadı.");
  }

  return user.id;
}

const PROGRAM_SELECT_WITH_EXERCISES =
  "id, name, training_days, muscle_group_ids, user_workout_program_exercises(id, exercise_id, sets, reps, rest_seconds, order_index)";

class SupabaseProgramRepository implements ProgramRepository {
  async listPrograms(): Promise<UserProgram[]> {
    const { data, error } = await supabase
      .from("user_workout_programs")
      .select(PROGRAM_SELECT_WITH_EXERCISES)
      .order("created_at", { ascending: true });

    if (error || !data) {
      throw new ProgramRepositoryError("REQUEST_FAILED", "Programlar alınamadı.");
    }

    return (data as unknown as ProgramRow[]).map(mapProgramRow);
  }

  async addExerciseToPrograms(
    programIds: string[],
    exercise: ProgramExercise,
  ): Promise<AddExerciseToProgramsResult> {
    const requestedIds = [...new Set(programIds)];

    const { data, error } = await supabase
      .from("user_workout_programs")
      .select(
        "id, name, user_workout_program_exercises(exercise_id, order_index)",
      )
      .in("id", requestedIds);

    if (error || !data) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        "Programlar güncellenemedi.",
      );
    }

    type Row = {
      id: string;
      name: string;
      user_workout_program_exercises: { exercise_id: string; order_index: number }[] | null;
    };
    const programsById = new Map(
      (data as unknown as Row[]).map((row) => [row.id, row]),
    );

    const results: AddExerciseResultItem[] = [];

    for (const programId of requestedIds) {
      const program = programsById.get(programId);

      if (!program) {
        results.push({
          programId,
          programName: "Bulunamayan program",
          status: "failed",
        });
        continue;
      }

      const existingExercises = program.user_workout_program_exercises ?? [];
      const alreadyExists = existingExercises.some(
        (item) => item.exercise_id === exercise.exerciseId,
      );

      if (alreadyExists) {
        results.push({
          programId,
          programName: program.name,
          status: "alreadyExists",
        });
        continue;
      }

      const nextOrderIndex = existingExercises.length;
      const { error: insertError } = await supabase
        .from("user_workout_program_exercises")
        .insert({
          program_id: programId,
          exercise_id: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.restSeconds,
          order_index: nextOrderIndex,
        });

      results.push({
        programId,
        programName: program.name,
        status: insertError ? "failed" : "added",
      });
    }

    return { results: sortResultsByRequestOrder(results, requestedIds) };
  }

  async createProgramWithExercise(
    input: CreateProgramWithExerciseInput,
  ): Promise<UserProgram> {
    const userId = await requireUserId();
    const trimmedName = input.name.trim();

    if (
      trimmedName.length === 0 ||
      input.trainingDays.length === 0 ||
      input.muscleGroupIds.length === 0
    ) {
      throw new ProgramRepositoryError("INVALID_INPUT", "Program bilgileri eksik.");
    }

    const { data: programRow, error: insertProgramError } = await supabase
      .from("user_workout_programs")
      .insert({
        user_id: userId,
        name: trimmedName,
        training_days: toDayCodes(input.trainingDays),
        muscle_group_ids: input.muscleGroupIds,
      })
      .select("id, name, training_days, muscle_group_ids")
      .single();

    if (insertProgramError || !programRow) {
      // Postgres unique_violation: (user_id, lower(btrim(name))) çakışması.
      if (insertProgramError?.code === "23505") {
        throw new ProgramRepositoryError(
          "DUPLICATE_NAME",
          "Bu ad ile zaten bir programınız var.",
        );
      }
      throw new ProgramRepositoryError("REQUEST_FAILED", "Program oluşturulamadı.");
    }

    const { data: exerciseRow, error: insertExerciseError } = await supabase
      .from("user_workout_program_exercises")
      .insert({
        program_id: programRow.id,
        exercise_id: input.exercise.exerciseId,
        sets: input.exercise.sets,
        reps: input.exercise.reps,
        rest_seconds: input.exercise.restSeconds,
        order_index: 0,
      })
      .select("id, exercise_id, sets, reps, rest_seconds, order_index")
      .single();

    if (insertExerciseError || !exerciseRow) {
      // Program oluşturuldu ama egzersiz eklenemedi; yarım kalmış bir program
      // bırakmamak için oluşturulan programı geri al.
      await supabase.from("user_workout_programs").delete().eq("id", programRow.id);
      throw new ProgramRepositoryError("REQUEST_FAILED", "Program oluşturulamadı.");
    }

    return mapProgramRow({
      ...programRow,
      user_workout_program_exercises: [exerciseRow],
    } as ProgramRow);
  }
}

export const programRepository: ProgramRepository = new SupabaseProgramRepository();

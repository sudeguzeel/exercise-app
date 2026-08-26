import type { TrainingDay } from "@/providers/OnboardingContext";
import { resolveProgramExerciseRestSeconds } from "@/features/exercises/program-exercise-rest";
import i18n from "@/shared/i18n";
import { supabase } from "@/shared/lib/supabase";
import type {
  AddExerciseResultItem,
  AddExerciseToProgramsResult,
  CreateProgramWithExerciseInput,
  PersistedProgramExercise,
  ProgramExercise,
  ProgramRepository,
  UpdateProgramInput,
  UserProgram,
} from "@/features/programs/types";

export type ProgramRepositoryErrorCode =
  | "AUTH_REQUIRED"
  | "DUPLICATE_NAME"
  | "INVALID_INPUT"
  | "EXERCISE_NOT_FOUND"
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
  rest_seconds: number | null | undefined;
  order_index: number;
  exercises: { name: string } | null;
};

type ProgramRow = {
  id: string;
  name: string;
  training_days: string[] | null;
  muscle_group_ids: string[] | null;
  user_workout_program_exercises: ProgramExerciseRow[] | null;
};

function toPersistedExercise(row: ProgramExerciseRow): PersistedProgramExercise {
  const hasStoredRestSeconds =
    typeof row.rest_seconds === "number" && Number.isFinite(row.rest_seconds);
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    sets: row.sets,
    reps: row.reps,
    restSeconds: resolveProgramExerciseRestSeconds({
      customRestSeconds: row.rest_seconds,
      recommendedRestSeconds: null,
    }),
    restSecondsOrigin: hasStoredRestSeconds ? "stored" : "fallback",
    name: row.exercises?.name ?? i18n.t("programRepo.exerciseDefaultName"),
    orderIndex: row.order_index,
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
    throw new ProgramRepositoryError("AUTH_REQUIRED", i18n.t("programRepo.authRequired"));
  }

  return user.id;
}

const PROGRAM_SELECT_WITH_EXERCISES =
  "id, name, training_days, muscle_group_ids, user_workout_program_exercises(id, exercise_id, sets, reps, rest_seconds, order_index, exercises(name))";

const VALUE_RANGES = {
  sets: { min: 1, max: 10 },
  reps: { min: 1, max: 100 },
  restSeconds: { min: 0, max: 300 },
} as const;

function isWithinRange(value: number, range: { min: number; max: number }) {
  return Number.isInteger(value) && value >= range.min && value <= range.max;
}

function assertValidExerciseValues(exercise: ProgramExercise) {
  const valid =
    isWithinRange(exercise.sets, VALUE_RANGES.sets) &&
    isWithinRange(exercise.reps, VALUE_RANGES.reps) &&
    isWithinRange(exercise.restSeconds, VALUE_RANGES.restSeconds);

  if (!valid) {
    throw new ProgramRepositoryError(
      "INVALID_INPUT",
      i18n.t("programRepo.valueRangeInvalid"),
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProgramId(value: string | null | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
}

class SupabaseProgramRepository implements ProgramRepository {
  async listPrograms(): Promise<UserProgram[]> {
    await requireUserId();

    const { data, error } = await supabase
      .from("user_workout_programs")
      .select(PROGRAM_SELECT_WITH_EXERCISES)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error || !data) {
      throw new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programsUnavailable"));
    }

    return (data as unknown as ProgramRow[]).map(mapProgramRow);
  }

  async getProgramById(programId: string): Promise<UserProgram | null> {
    if (!isValidProgramId(programId)) {
      return null;
    }

    await requireUserId();

    const { data, error } = await supabase
      .from("user_workout_programs")
      .select(PROGRAM_SELECT_WITH_EXERCISES)
      .eq("id", programId)
      .maybeSingle();

    if (error) {
      throw new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programUnavailable"));
    }

    return data ? mapProgramRow(data as unknown as ProgramRow) : null;
  }

  async addExerciseToPrograms(
    programIds: string[],
    exercise: ProgramExercise,
  ): Promise<AddExerciseToProgramsResult> {
    const trimmedExerciseId = exercise.exerciseId?.trim();
    if (!trimmedExerciseId) {
      throw new ProgramRepositoryError("INVALID_INPUT", i18n.t("programRepo.exerciseIdMissing"));
    }
    if (!Array.isArray(programIds) || programIds.length === 0) {
      throw new ProgramRepositoryError(
        "INVALID_INPUT",
        i18n.t("programRepo.atLeastOneProgramRequired"),
      );
    }
    assertValidExerciseValues(exercise);

    await requireUserId();

    const { data: exerciseRow, error: exerciseError } = await supabase
      .from("exercises")
      .select("id")
      .eq("id", trimmedExerciseId)
      .maybeSingle();

    if (exerciseError) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        i18n.t("programRepo.exerciseValidationFailed"),
      );
    }
    if (!exerciseRow) {
      throw new ProgramRepositoryError("EXERCISE_NOT_FOUND", i18n.t("programRepo.exerciseNotFound"));
    }

    const requestedIds = [...new Set(programIds)];
    const validProgramIds = requestedIds.filter((id) => UUID_PATTERN.test(id));

    type Row = {
      id: string;
      name: string;
      user_workout_program_exercises: { exercise_id: string; order_index: number }[] | null;
    };

    let programsById = new Map<string, Row>();
    if (validProgramIds.length > 0) {
      const { data, error } = await supabase
        .from("user_workout_programs")
        .select(
          "id, name, user_workout_program_exercises(exercise_id, order_index)",
        )
        .in("id", validProgramIds);

      if (error || !data) {
        throw new ProgramRepositoryError(
          "REQUEST_FAILED",
          i18n.t("programRepo.programsUpdateFailed"),
        );
      }

      programsById = new Map(
        (data as unknown as Row[]).map((row) => [row.id, row]),
      );
    }

    const results: AddExerciseResultItem[] = [];

    for (const programId of requestedIds) {
      if (!UUID_PATTERN.test(programId)) {
        results.push({
          programId,
          programName: i18n.t("programRepo.invalidProgramIdName"),
          status: "failed",
        });
        continue;
      }

      const program = programsById.get(programId);

      if (!program) {
        results.push({
          programId,
          programName: i18n.t("programRepo.programNotFoundShort"),
          status: "failed",
        });
        continue;
      }

      const existingExercises = program.user_workout_program_exercises ?? [];
      const alreadyExists = existingExercises.some(
        (item) => item.exercise_id === trimmedExerciseId,
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
          exercise_id: trimmedExerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.restSeconds,
          order_index: nextOrderIndex,
        });

      let status: AddExerciseResultItem["status"] = "added";
      if (insertError) {
        status = insertError.code === "23505" ? "alreadyExists" : "failed";
      }

      results.push({
        programId,
        programName: program.name,
        status,
      });
    }

    return { results: sortResultsByRequestOrder(results, requestedIds) };
  }

  async createProgramWithExercise(
    input: CreateProgramWithExerciseInput,
  ): Promise<UserProgram> {
    const trimmedName = input.name.trim();
    const trimmedExerciseId = input.exercise.exerciseId?.trim();

    if (
      trimmedName.length === 0 ||
      input.trainingDays.length === 0 ||
      input.muscleGroupIds.length === 0 ||
      !trimmedExerciseId
    ) {
      throw new ProgramRepositoryError("INVALID_INPUT", i18n.t("programRepo.programInfoMissing"));
    }
    assertValidExerciseValues(input.exercise);

    const { data, error } = await supabase.rpc("create_program_with_exercise", {
      p_name: trimmedName,
      p_training_days: toDayCodes(input.trainingDays),
      p_muscle_group_ids: input.muscleGroupIds,
      p_exercise_id: trimmedExerciseId,
      p_sets: input.exercise.sets,
      p_reps: input.exercise.reps,
      p_rest_seconds: input.exercise.restSeconds,
    });

    if (error || !data || data.length === 0) {
      throw mapCreateProgramError(error);
    }

    const programId = data[0].program_id as string;

    const { data: programRow, error: fetchError } = await supabase
      .from("user_workout_programs")
      .select(PROGRAM_SELECT_WITH_EXERCISES)
      .eq("id", programId)
      .single();

    if (fetchError || !programRow) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        i18n.t("programRepo.programCreatedButUnreadable"),
      );
    }

    return mapProgramRow(programRow as unknown as ProgramRow);
  }

  async updateProgram(input: UpdateProgramInput): Promise<UserProgram> {
    const trimmedName = input.name.trim();
    if (
      !isValidProgramId(input.id) ||
      !trimmedName ||
      input.trainingDays.length === 0 ||
      input.muscleGroupIds.length === 0
    ) {
      throw new ProgramRepositoryError(
        "INVALID_INPUT",
        i18n.t("programRepo.programInfoInvalid"),
      );
    }

    const exerciseIds = input.exercises.map((exercise) => exercise.exerciseId);
    if (new Set(exerciseIds).size !== exerciseIds.length) {
      throw new ProgramRepositoryError(
        "INVALID_INPUT",
        i18n.t("programRepo.duplicateExerciseInProgram"),
      );
    }
    input.exercises.forEach(assertValidExerciseValues);

    await requireUserId();
    const currentProgram = await this.getProgramById(input.id);
    if (!currentProgram) {
      throw new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programNotFound"));
    }

    const { error: programError } = await supabase
      .from("user_workout_programs")
      .update({
        name: trimmedName,
        training_days: toDayCodes(input.trainingDays),
        muscle_group_ids: input.muscleGroupIds,
      })
      .eq("id", input.id);

    if (programError) {
      if (programError.code === "23505") {
        throw new ProgramRepositoryError(
          "DUPLICATE_NAME",
          i18n.t("programRepo.duplicateProgramName"),
        );
      }
      throw new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programUpdateFailed"));
    }

    const currentIds = new Set(
      currentProgram.exercises.map((exercise) => exercise.id),
    );
    const nextExistingIds = new Set(
      input.exercises
        .filter((exercise) => currentIds.has(exercise.id))
        .map((exercise) => exercise.id),
    );
    const removedIds = [...currentIds].filter((id) => !nextExistingIds.has(id));

    if (removedIds.length > 0) {
      const { error } = await supabase
        .from("user_workout_program_exercises")
        .delete()
        .eq("program_id", input.id)
        .in("id", removedIds);
      if (error) {
        throw new ProgramRepositoryError(
          "REQUEST_FAILED",
          i18n.t("programRepo.programExercisesUpdateFailed"),
        );
      }
    }

    for (const [orderIndex, exercise] of input.exercises.entries()) {
      if (!currentIds.has(exercise.id)) continue;
      const { error } = await supabase
        .from("user_workout_program_exercises")
        .update({
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.restSeconds,
          order_index: orderIndex,
        })
        .eq("program_id", input.id)
        .eq("id", exercise.id);
      if (error) {
        throw new ProgramRepositoryError(
          "REQUEST_FAILED",
          i18n.t("programRepo.exerciseOrderUpdateFailed"),
        );
      }
    }

    const addedExercises = input.exercises
      .map((exercise, orderIndex) => ({ exercise, orderIndex }))
      .filter(({ exercise }) => !currentIds.has(exercise.id));

    if (addedExercises.length > 0) {
      const { error } = await supabase
        .from("user_workout_program_exercises")
        .insert(
          addedExercises.map(({ exercise, orderIndex }) => ({
            program_id: input.id,
            exercise_id: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_seconds: exercise.restSeconds,
            order_index: orderIndex,
          })),
        );
      if (error) {
        throw new ProgramRepositoryError(
          "REQUEST_FAILED",
          i18n.t("programRepo.newExercisesAddFailed"),
        );
      }
    }

    const updatedProgram = await this.getProgramById(input.id);
    if (!updatedProgram) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        i18n.t("programRepo.programUpdatedButUnreadable"),
      );
    }
    return updatedProgram;
  }

  async deleteProgram(programId: string): Promise<void> {
    if (!isValidProgramId(programId)) {
      throw new ProgramRepositoryError("INVALID_INPUT", i18n.t("programRepo.invalidProgramId"));
    }

    await requireUserId();
    const { error } = await supabase
      .from("user_workout_programs")
      .delete()
      .eq("id", programId);

    if (error) {
      throw new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programDeleteFailed"));
    }
  }
}

function mapCreateProgramError(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? "";

  if (message.includes("AUTH_REQUIRED")) {
    return new ProgramRepositoryError("AUTH_REQUIRED", i18n.t("programRepo.authRequired"));
  }
  if (message.includes("EXERCISE_NOT_FOUND")) {
    return new ProgramRepositoryError("EXERCISE_NOT_FOUND", i18n.t("programRepo.exerciseNotFound"));
  }
  if (
    message.includes("INVALID_NAME") ||
    message.includes("AT_LEAST_ONE_DAY_REQUIRED") ||
    message.includes("INVALID_DAY") ||
    message.includes("AT_LEAST_ONE_MUSCLE_GROUP_REQUIRED") ||
    message.includes("INVALID_MUSCLE_GROUP")
  ) {
    return new ProgramRepositoryError("INVALID_INPUT", i18n.t("programRepo.programInfoInvalid"));
  }
  if (error?.code === "23505") {
    return new ProgramRepositoryError(
      "DUPLICATE_NAME",
      i18n.t("programRepo.duplicateProgramName"),
    );
  }
  if (error?.code === "23514") {
    return new ProgramRepositoryError(
      "INVALID_INPUT",
      i18n.t("programRepo.setRepRestRangeInvalid"),
    );
  }
  return new ProgramRepositoryError("REQUEST_FAILED", i18n.t("programRepo.programCreateFailed"));
}

export const programRepository: ProgramRepository = new SupabaseProgramRepository();

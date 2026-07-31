import {
  validateCustomExerciseValues,
} from "@/src/features/exercises/exercise-detail-validation";

export type ProgramValueSource = "recommended" | "custom";

export type ProgramSelectionPayload = {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  valueSource: ProgramValueSource;
};

export type ProgramSelectionSearchParams = {
  exerciseId?: string | string[];
  sets?: string | string[];
  reps?: string | string[];
  restSeconds?: string | string[];
  valueSource?: string | string[];
};

export function serializeProgramSelectionPayload(
  payload: ProgramSelectionPayload,
): Record<keyof ProgramSelectionPayload, string> {
  return {
    exerciseId: payload.exerciseId,
    sets: String(payload.sets),
    reps: payload.reps,
    restSeconds: String(payload.restSeconds),
    valueSource: payload.valueSource,
  };
}

export function parseProgramSelectionParams(
  params: ProgramSelectionSearchParams,
): ProgramSelectionPayload | null {
  const exerciseId = getSingleParam(params.exerciseId)?.trim();
  const sets = getSingleParam(params.sets)?.trim();
  const reps = getSingleParam(params.reps)?.trim();
  const restSeconds = getSingleParam(params.restSeconds)?.trim();
  const valueSource = getSingleParam(params.valueSource);

  if (
    !exerciseId ||
    sets === undefined ||
    !reps ||
    restSeconds === undefined ||
    (valueSource !== "recommended" && valueSource !== "custom")
  ) {
    return null;
  }

  if (valueSource === "custom") {
    const validation = validateCustomExerciseValues({
      sets,
      reps,
      restSeconds,
    });
    if (!validation.success) return null;

    return {
      exerciseId,
      sets: validation.values.sets,
      reps: String(validation.values.reps),
      restSeconds: validation.values.restSeconds,
      valueSource,
    };
  }

  if (!isIntegerInRange(sets, 1, 10) || !isIntegerInRange(restSeconds, 0, 600)) {
    return null;
  }

  return {
    exerciseId,
    sets: Number(sets),
    reps,
    restSeconds: Number(restSeconds),
    valueSource,
  };
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isIntegerInRange(value: string, min: number, max: number) {
  if (!/^\d+$/.test(value)) return false;
  const parsedValue = Number(value);
  return (
    Number.isSafeInteger(parsedValue) &&
    parsedValue >= min &&
    parsedValue <= max
  );
}

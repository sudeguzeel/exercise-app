import {
  validateCustomExerciseValues,
} from "@/features/exercises/exercise-detail-validation";
import { resolveProgramExerciseRestSeconds } from "@/features/exercises/program-exercise-rest";
import type { TrainingDay } from "@/providers/OnboardingContext";

export type ProgramSelectionPayload = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
  weightKg?: number;
};

export type ProgramSelectionSearchParams = {
  exerciseId?: string | string[];
  sets?: string | string[];
  reps?: string | string[];
  restSeconds?: string | string[];
  weightKg?: string | string[];
  initialTrainingDay?: string | string[];
};

export function serializeProgramSelectionPayload(
  payload: ProgramSelectionPayload,
  initialTrainingDay?: TrainingDay | null,
): Record<string, string> {
  const params: Record<string, string> = {
    exerciseId: payload.exerciseId,
    sets: String(payload.sets),
    reps: String(payload.reps),
    restSeconds: String(
      resolveProgramExerciseRestSeconds({
        customRestSeconds: payload.restSeconds,
        recommendedRestSeconds: null,
      }),
    ),
  };
  if (initialTrainingDay) params.initialTrainingDay = initialTrainingDay;
  if (payload.weightKg !== undefined) {
    params.weightKg = String(payload.weightKg);
  }
  return params;
}

const TRAINING_DAYS: TrainingDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function parseInitialTrainingDay(
  params: Pick<ProgramSelectionSearchParams, "initialTrainingDay">,
): TrainingDay | null {
  const rawValue = params.initialTrainingDay;
  const value = (Array.isArray(rawValue)
    ? rawValue[rawValue.length - 1]
    : rawValue)?.trim() as
    | TrainingDay
    | undefined;
  return value && TRAINING_DAYS.includes(value) ? value : null;
}

export function parseProgramSelectionParams(
  params: ProgramSelectionSearchParams,
): ProgramSelectionPayload | null {
  const exerciseId = getSingleParam(params.exerciseId)?.trim();
  const sets = getSingleParam(params.sets)?.trim();
  const reps = getSingleParam(params.reps)?.trim();
  const restSeconds = getSingleParam(params.restSeconds)?.trim();
  const weightKgValue = getSingleParam(params.weightKg)?.trim();

  if (!exerciseId || sets === undefined || reps === undefined || restSeconds === undefined) {
    return null;
  }

  const validation = validateCustomExerciseValues({ sets, reps, restSeconds });
  if (!validation.success) return null;
  const weightKg =
    weightKgValue === undefined || weightKgValue === ""
      ? undefined
      : Number(weightKgValue.replace(",", "."));
  if (
    weightKg !== undefined &&
    (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 500)
  ) {
    return null;
  }

  return {
    exerciseId,
    sets: validation.values.sets,
    reps: validation.values.reps,
    restSeconds: resolveProgramExerciseRestSeconds({
      customRestSeconds: validation.values.restSeconds,
      recommendedRestSeconds: null,
    }),
    ...(weightKg === undefined ? {} : { weightKg }),
  };
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

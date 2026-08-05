import {
  validateCustomExerciseValues,
} from "@/features/exercises/exercise-detail-validation";

// Not: DB'deki exercises kataloğunda "önerilen set/tekrar/dinlenme" alanı
// yok (bkz. exercise_taxonomy.ts / exerciseCatalogService.ts), bu yüzden
// "recommended" değer kaynağı kavramı kaldırıldı — kullanıcı set/tekrar/
// dinlenmeyi her zaman kendisi giriyor. reps de artık user_workout_program_
// exercises.reps ile aynı tipte (smallint) bir sayı.
export type ProgramSelectionPayload = {
  exerciseId: string;
  sets: number;
  reps: number;
  restSeconds: number;
};

export type ProgramSelectionSearchParams = {
  exerciseId?: string | string[];
  sets?: string | string[];
  reps?: string | string[];
  restSeconds?: string | string[];
};

export function serializeProgramSelectionPayload(
  payload: ProgramSelectionPayload,
): Record<keyof ProgramSelectionPayload, string> {
  return {
    exerciseId: payload.exerciseId,
    sets: String(payload.sets),
    reps: String(payload.reps),
    restSeconds: String(payload.restSeconds),
  };
}

export function parseProgramSelectionParams(
  params: ProgramSelectionSearchParams,
): ProgramSelectionPayload | null {
  const exerciseId = getSingleParam(params.exerciseId)?.trim();
  const sets = getSingleParam(params.sets)?.trim();
  const reps = getSingleParam(params.reps)?.trim();
  const restSeconds = getSingleParam(params.restSeconds)?.trim();

  if (!exerciseId || sets === undefined || reps === undefined || restSeconds === undefined) {
    return null;
  }

  const validation = validateCustomExerciseValues({ sets, reps, restSeconds });
  if (!validation.success) return null;

  return {
    exerciseId,
    sets: validation.values.sets,
    reps: validation.values.reps,
    restSeconds: validation.values.restSeconds,
  };
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

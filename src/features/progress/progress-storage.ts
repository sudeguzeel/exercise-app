import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  BodyMeasurementRecord,
  BodyProgress,
  WorkingWeightRecord,
} from "@/features/progress/types";
import type { UserProgram } from "@/features/programs/types";
import {
  loadProfilePersonalInfo,
  saveProfilePersonalInfo,
} from "@/shared/lib/services/profileService";
import { supabase } from "@/shared/lib/supabase";

const PROGRESS_STORAGE_PREFIX = "@exercise-app/progress/v1";
const weightUpdateLocks = new Set<string>();

function workingWeightsKey(userId: string) {
  return `${PROGRESS_STORAGE_PREFIX}:${userId}:working-weights`;
}

function bodyMeasurementsKey(userId: string) {
  return `${PROGRESS_STORAGE_PREFIX}:${userId}:body-measurements`;
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Oturum bilgisi bulunamadı.");
  return user.id;
}

async function readArray<T>(key: string): Promise<T[]> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function writeArray<T>(key: string, values: readonly T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(values));
}

export async function listWorkingWeights() {
  const userId = await requireUserId();
  const records = await readArray<WorkingWeightRecord>(workingWeightsKey(userId));
  return records.filter(
    (record) =>
      record.userId === userId &&
      Boolean(record.programExerciseId) &&
      Number.isFinite(record.weightKg) &&
      record.weightKg >= 0,
  );
}

export async function getWorkingWeight(
  programExerciseId: string,
  knownUserId?: string,
) {
  const userId = knownUserId ?? (await requireUserId());
  const records = await readArray<WorkingWeightRecord>(workingWeightsKey(userId));
  return (
    records.find(
      (record) =>
        record.userId === userId &&
        record.programExerciseId === programExerciseId,
    ) ?? null
  );
}

export async function saveWorkingWeight(input: {
  programExerciseId: string;
  exerciseId: string;
  weightKg: number;
}) {
  if (
    !input.programExerciseId.trim() ||
    !input.exerciseId.trim() ||
    !Number.isFinite(input.weightKg) ||
    input.weightKg < 0 ||
    input.weightKg > 500
  ) {
    throw new Error("Çalışma kilosu geçersiz.");
  }

  const userId = await requireUserId();
  const lockKey = `${userId}:${input.programExerciseId}`;
  if (weightUpdateLocks.has(lockKey)) {
    throw new Error("Bu hareketin kilosu zaten güncelleniyor.");
  }
  weightUpdateLocks.add(lockKey);

  try {
    const key = workingWeightsKey(userId);
    const records = await readArray<WorkingWeightRecord>(key);
    const index = records.findIndex(
      (record) =>
        record.userId === userId &&
        record.programExerciseId === input.programExerciseId,
    );
    const existing = index >= 0 ? records[index] : null;
    if (existing?.weightKg === input.weightKg) return existing;

    const next: WorkingWeightRecord = {
      userId,
      programExerciseId: input.programExerciseId,
      exerciseId: input.exerciseId,
      weightKg: input.weightKg,
      previousWeightKg: existing?.weightKg ?? null,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) records[index] = next;
    else records.push(next);
    await writeArray(key, records);
    return next;
  } finally {
    weightUpdateLocks.delete(lockKey);
  }
}

export async function saveInitialProgramExerciseWeight(
  program: UserProgram,
  exerciseId: string,
  weightKg: number | undefined,
) {
  if (weightKg === undefined) return null;
  const matches = program.exercises.filter(
    (exercise) => exercise.exerciseId === exerciseId,
  );
  if (matches.length !== 1) {
    throw new Error("Programdaki egzersiz kilo kaydıyla eşleştirilemedi.");
  }
  return saveWorkingWeight({
    programExerciseId: matches[0].id,
    exerciseId,
    weightKg,
  });
}

async function readBodyMeasurements(userId: string) {
  const records = await readArray<BodyMeasurementRecord>(
    bodyMeasurementsKey(userId),
  );
  return records
    .filter((record) => record.userId === userId)
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadBodyProgress(): Promise<BodyProgress> {
  const userId = await requireUserId();
  const [profileResult, measurements] = await Promise.all([
    loadProfilePersonalInfo(),
    readBodyMeasurements(userId),
  ]);
  const latest = measurements.at(-1) ?? null;
  const profile = profileResult.success ? profileResult.personalInfo : null;
  const profileWeight = profile ? parseOptionalNumber(profile.currentWeight) : null;

  return {
    currentWeightKg: latest?.weightKg ?? profileWeight,
    targetWeightKg: profile ? parseOptionalNumber(profile.targetWeight) : null,
    startingWeightKg: measurements[0]?.weightKg ?? profileWeight,
    bodyFatPercentage: latest?.bodyFatPercentage ?? null,
    musclePercentage: latest?.musclePercentage ?? null,
    updatedAt: latest?.recordedAt ?? null,
  };
}

export async function saveBodyMeasurement(input: {
  weightKg: number;
  bodyFatPercentage: number;
  musclePercentage: number;
}) {
  const userId = await requireUserId();
  const profileResult = await loadProfilePersonalInfo();
  if (!profileResult.success) throw new Error(profileResult.message);

  const key = bodyMeasurementsKey(userId);
  const current = await readBodyMeasurements(userId);
  const next: BodyMeasurementRecord = {
    id: `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    ...input,
    recordedAt: new Date().toISOString(),
  };
  await writeArray(key, [...current, next]);

  const saveResult = await saveProfilePersonalInfo({
    ...profileResult.personalInfo,
    currentWeight: String(input.weightKg),
  });
  if (!saveResult.success) {
    await writeArray(key, current);
    throw new Error(saveResult.message);
  }
  return next;
}

export async function saveTargetWeight(targetWeightKg: number) {
  if (!Number.isFinite(targetWeightKg) || targetWeightKg <= 0 || targetWeightKg > 500) {
    throw new Error("Hedef kilo 0 ile 500 kg arasında olmalıdır.");
  }
  const profileResult = await loadProfilePersonalInfo();
  if (!profileResult.success) throw new Error(profileResult.message);
  const saveResult = await saveProfilePersonalInfo({
    ...profileResult.personalInfo,
    targetWeight: String(targetWeightKg),
  });
  if (!saveResult.success) throw new Error(saveResult.message);
}

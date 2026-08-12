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

const weightUpdateLocks = new Set<string>();

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Oturum bilgisi bulunamadı.");
  return user.id;
}

const WORKING_WEIGHT_COLUMNS =
  "user_id, program_exercise_id, exercise_id, weight_kg, previous_weight_kg, updated_at";

type WorkingWeightRow = {
  user_id: string;
  program_exercise_id: string;
  exercise_id: string;
  weight_kg: number;
  previous_weight_kg: number | null;
  updated_at: string;
};

function mapWorkingWeightRow(row: WorkingWeightRow): WorkingWeightRecord {
  return {
    userId: row.user_id,
    programExerciseId: row.program_exercise_id,
    exerciseId: row.exercise_id,
    weightKg: row.weight_kg,
    previousWeightKg: row.previous_weight_kg,
    updatedAt: row.updated_at,
  };
}

export async function listWorkingWeights() {
  // RLS (auth.uid() = user_id) zaten sadece bu kullanıcının satırlarını
  // döndürür.
  const { data, error } = await supabase
    .from("user_exercise_working_weights")
    .select(WORKING_WEIGHT_COLUMNS);
  if (error) throw new Error("Çalışma kiloları alınamadı.");
  return (data as unknown as WorkingWeightRow[]).map(mapWorkingWeightRow);
}

export async function getWorkingWeight(
  programExerciseId: string,
  knownUserId?: string,
) {
  const userId = knownUserId ?? (await requireUserId());
  const { data, error } = await supabase
    .from("user_exercise_working_weights")
    .select(WORKING_WEIGHT_COLUMNS)
    .eq("user_id", userId)
    .eq("program_exercise_id", programExerciseId)
    .maybeSingle<WorkingWeightRow>();
  if (error || !data) return null;
  return mapWorkingWeightRow(data);
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
    const existing = await getWorkingWeight(input.programExerciseId, userId);
    if (existing?.weightKg === input.weightKg) return existing;

    const { data, error } = await supabase
      .from("user_exercise_working_weights")
      .upsert(
        {
          user_id: userId,
          program_exercise_id: input.programExerciseId,
          exercise_id: input.exerciseId,
          weight_kg: input.weightKg,
          previous_weight_kg: existing?.weightKg ?? null,
        },
        { onConflict: "user_id,program_exercise_id" },
      )
      .select(WORKING_WEIGHT_COLUMNS)
      .single<WorkingWeightRow>();

    if (error || !data) throw new Error("Çalışma kilosu kaydedilemedi.");
    return mapWorkingWeightRow(data);
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

const BODY_MEASUREMENT_COLUMNS =
  "id, user_id, weight_kg, body_fat_percentage, muscle_percentage, recorded_at";

type BodyMeasurementRow = {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat_percentage: number;
  muscle_percentage: number;
  recorded_at: string;
};

function mapBodyMeasurementRow(row: BodyMeasurementRow): BodyMeasurementRecord {
  return {
    id: row.id,
    userId: row.user_id,
    weightKg: row.weight_kg,
    bodyFatPercentage: row.body_fat_percentage,
    musclePercentage: row.muscle_percentage,
    recordedAt: row.recorded_at,
  };
}

async function readBodyMeasurements(): Promise<BodyMeasurementRecord[]> {
  const { data, error } = await supabase
    .from("user_body_measurements")
    .select(BODY_MEASUREMENT_COLUMNS)
    .order("recorded_at", { ascending: true });
  if (error) throw new Error("Vücut ölçümleri alınamadı.");
  return (data as unknown as BodyMeasurementRow[]).map(mapBodyMeasurementRow);
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadBodyProgress(): Promise<BodyProgress> {
  const [profileResult, measurements] = await Promise.all([
    loadProfilePersonalInfo(),
    readBodyMeasurements(),
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

  const { data, error } = await supabase
    .from("user_body_measurements")
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      body_fat_percentage: input.bodyFatPercentage,
      muscle_percentage: input.musclePercentage,
    })
    .select(BODY_MEASUREMENT_COLUMNS)
    .single<BodyMeasurementRow>();

  if (error || !data) throw new Error("Ölçümler kaydedilemedi.");

  // profiles/body_metrics'teki "güncel kilo" alanı bu ölçüm geçmişinin en
  // son değeriyle senkron kalmalı (onboarding/profil ekranları oradan
  // okuyor). Profil güncellemesi başarısız olursa yeni ölçüm kaydı da geri
  // alınır — ikisi tutarsız kalmasın.
  const saveResult = await saveProfilePersonalInfo({
    ...profileResult.personalInfo,
    currentWeight: String(input.weightKg),
  });
  if (!saveResult.success) {
    await supabase.from("user_body_measurements").delete().eq("id", data.id);
    throw new Error(saveResult.message);
  }
  return mapBodyMeasurementRow(data);
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

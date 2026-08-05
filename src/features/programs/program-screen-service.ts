import type { ProgramCompletionRecord } from "@/features/programs/program-dashboard";
import { workoutRepository } from "@/features/workouts/workout-repository";
import { supabase } from "@/shared/lib/supabase";

export async function getCurrentUserDisplayName(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileName = (data?.full_name as string | null | undefined)?.trim();
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const fallbackName = user.email?.split("@")[0]?.trim() ?? "";
  const fullName = profileName || metadataName || fallbackName;

  return fullName ? fullName.split(/\s+/)[0] : null;
}

export async function getProgramCompletionRecords(
  weekStart: string,
  weekEnd: string,
): Promise<ProgramCompletionRecord[]> {
  const [remoteResult, localResult] = await Promise.allSettled([
    supabase
      .from("user_completed_exercises")
      .select("program_exercise_id, workout_date")
      .gte("workout_date", weekStart)
      .lte("workout_date", weekEnd),
    workoutRepository.getLocalCompletedExerciseRecords(weekStart, weekEnd),
  ]);

  const remoteRecords: ProgramCompletionRecord[] = [];
  if (
    remoteResult.status === "fulfilled" &&
    !remoteResult.value.error &&
    remoteResult.value.data
  ) {
    for (const row of remoteResult.value.data as unknown as {
      program_exercise_id: string;
      workout_date: string;
    }[]) {
      remoteRecords.push({
        programExerciseId: row.program_exercise_id,
        workoutDate: row.workout_date,
      });
    }
  }

  const localRecords =
    localResult.status === "fulfilled"
      ? localResult.value.map((record) => ({
          programExerciseId: record.programExerciseId,
          workoutDate: record.workoutDate,
        }))
      : [];

  const remoteUnavailable =
    remoteResult.status === "rejected" || Boolean(remoteResult.value.error);
  if (remoteUnavailable && localResult.status === "rejected") {
    throw new Error("Haftalık antrenman bilgileri alınamadı.");
  }

  const uniqueRecords = new Map<string, ProgramCompletionRecord>();
  for (const record of [...remoteRecords, ...localRecords]) {
    uniqueRecords.set(
      `${record.programExerciseId}:${record.workoutDate}`,
      record,
    );
  }
  return [...uniqueRecords.values()];
}

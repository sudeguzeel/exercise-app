import type { ProgramCompletionRecord } from "@/features/programs/program-dashboard";
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
  const { data, error } = await supabase
    .from("user_completed_exercises")
    .select("program_exercise_id, workout_date")
    .gte("workout_date", weekStart)
    .lte("workout_date", weekEnd);

  if (error || !data) {
    throw new Error("Haftalık antrenman bilgileri alınamadı.");
  }

  return (data as unknown as {
    program_exercise_id: string;
    workout_date: string;
  }[]).map((row) => ({
    programExerciseId: row.program_exercise_id,
    workoutDate: row.workout_date,
  }));
}

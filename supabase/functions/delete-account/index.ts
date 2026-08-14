import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const userId = user.id;

  const { data: programs, error: programsError } = await admin
    .from("user_workout_programs")
    .select("id")
    .eq("user_id", userId);
  if (programsError) return json({ error: "delete_failed", message: programsError.message }, 500);

  const programIds = (programs ?? []).map((p) => p.id as string);

  const deletions: Array<() => Promise<{ error: { message: string } | null }>> = [
    () => admin.from("user_workout_completion_sets").delete().eq("user_id", userId),
    () => admin.from("user_completed_exercises").delete().eq("user_id", userId),
    () => admin.from("user_exercise_working_weights").delete().eq("user_id", userId),
    () => admin.from("user_workout_completions").delete().eq("user_id", userId),
    () =>
      programIds.length > 0
        ? admin.from("user_workout_program_exercises").delete().in("program_id", programIds)
        : Promise.resolve({ error: null }),
    () => admin.from("user_workout_programs").delete().eq("user_id", userId),
    () => admin.from("user_favorite_exercises").delete().eq("user_id", userId),
    () => admin.from("user_body_measurements").delete().eq("user_id", userId),
    () => admin.from("user_weekly_training_days").delete().eq("user_id", userId),
    () => admin.from("user_fitness_focus_areas").delete().eq("user_id", userId),
    () => admin.from("user_onboarding_status").delete().eq("user_id", userId),
    () => admin.from("body_metrics").delete().eq("user_id", userId),
    () => admin.from("fitness_preferences").delete().eq("user_id", userId),
    () => admin.from("profiles").delete().eq("user_id", userId),
  ];

  for (const runDeletion of deletions) {
    const { error } = await runDeletion();
    if (error) return json({ error: "delete_failed", message: error.message }, 500);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return json({ error: "delete_user_failed", message: deleteUserError.message }, 500);
  }

  return json({ data: { deleted: true } }, 200);
});

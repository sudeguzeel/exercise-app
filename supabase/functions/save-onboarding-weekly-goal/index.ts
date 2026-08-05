import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = typeof allowedDays[number];
type FieldErrors = Record<string, string>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseDays(value: unknown, errors: FieldErrors): Day[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    errors.days = "En az bir antrenman günü gönderilmelidir.";
    return;
  }

  if (!value.every((d) => typeof d === "string")) {
    errors.days = "Gün değerleri metin (string) olmalıdır.";
    return;
  }

  const invalid = value.filter((d) => !allowedDays.includes(d as Day));
  if (invalid.length > 0) {
    errors.days = `Geçersiz gün değeri: ${[...new Set(invalid)].join(", ")}`;
    return;
  }

  return [...new Set(value as Day[])];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const errors: FieldErrors = {};
  const uniqueDays = parseDays(body.days, errors);

  if (Object.keys(errors).length) return json({ error: "validation_error", fieldErrors: errors }, 422);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  const { data, error } = await supabase
    .rpc("save_onboarding_weekly_goal", { p_days: uniqueDays })
    .single();

  if (error || !data) {
    return json({ error: "save_failed", message: "Haftalik hedef kaydedilemedi." }, 500);
  }

  return json({
    data: {
      userId: user.id,
      weeklyGoal: data.weekly_goal,
      onboardingCompleted: data.completed,
    },
  }, 200);
});
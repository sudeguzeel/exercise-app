import type { PersonalInfo } from "@/providers/OnboardingContext";
import { savePersonalInfo } from "@/shared/lib/services/personalInfoService";
import { supabase } from "@/shared/lib/supabase";

export type ProfilePersonalInfoResult =
  | { success: true; personalInfo: PersonalInfo }
  | { success: false; message: string };

type ProfileRow = {
  full_name: string | null;
  gender: "male" | "female" | "prefer_not_to_say" | null;
  birth_date: string | null;
};

type BodyMetricRow = {
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
};

type FitnessPreferenceRow = {
  goal: "muscle_gain" | "fat_loss" | "general_fitness" | null;
};

export async function loadProfilePersonalInfo(): Promise<ProfilePersonalInfoResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "Oturum bilgisi bulunamadı." };
  }

  const [profileResult, metricResult, preferenceResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, gender, birth_date")
      .eq("user_id", user.id)
      .maybeSingle<ProfileRow>(),
    loadLatestBodyMetric(user.id),
    supabase
      .from("fitness_preferences")
      .select("goal")
      .eq("user_id", user.id)
      .maybeSingle<FitnessPreferenceRow>(),
  ]);

  if (profileResult.error) {
    return { success: false, message: profileResult.error.message };
  }
  if (metricResult.error) {
    return { success: false, message: metricResult.error.message };
  }
  if (preferenceResult.error) {
    return { success: false, message: preferenceResult.error.message };
  }

  const profile = profileResult.data;
  const metric = metricResult.data;
  const preference = preferenceResult.data;

  if (!profile || !metric || !preference?.goal) {
    return { success: false, message: "Kişisel bilgiler eksik veya bulunamadı." };
  }

  return {
    success: true,
    personalInfo: {
      fullName: profile.full_name ?? "",
      gender: mapGenderFromDatabase(profile.gender),
      birthDate: formatDatabaseDate(profile.birth_date),
      height: numberToInput(metric.height_cm),
      currentWeight: numberToInput(metric.current_weight_kg),
      targetWeight: numberToInput(metric.target_weight_kg),
      goal: mapGoalFromDatabase(preference.goal),
    },
  };
}

// Canlı şema analizine göre bu RPC yalnızca profiles, body_metrics ve
// fitness_preferences.goal alanlarını günceller. Onboarding status, haftalık
// günler ve focus alanları bu RPC'nin kapsamında değildir.
export async function saveProfilePersonalInfo(personalInfo: PersonalInfo) {
  return savePersonalInfo(personalInfo);
}

async function loadLatestBodyMetric(userId: string) {
  const baseQuery = () =>
    supabase
      .from("body_metrics")
      .select("height_cm, current_weight_kg, target_weight_kg")
      .eq("user_id", userId);

  const updatedResult = await baseQuery()
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BodyMetricRow>();

  if (!updatedResult.error) return updatedResult;

  return baseQuery()
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BodyMetricRow>();
}

function mapGenderFromDatabase(value: ProfileRow["gender"]): PersonalInfo["gender"] {
  if (value === "male") return "male";
  if (value === "female") return "female";
  if (value === "prefer_not_to_say") return "other";
  return "";
}

function mapGoalFromDatabase(value: FitnessPreferenceRow["goal"]): PersonalInfo["goal"] {
  if (value === "muscle_gain") return "build-muscle";
  if (value === "fat_loss") return "lose-weight";
  if (value === "general_fitness") return "stay-fit";
  return "";
}

function formatDatabaseDate(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

function numberToInput(value: number | null) {
  return value == null ? "" : String(value);
}

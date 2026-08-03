import type { TrainingDay } from "@/providers/OnboardingContext";
import { supabase } from "@/shared/lib/supabase";

export type SaveWeeklyTrainingDaysResult =
  | { success: true; weeklyGoal: number }
  | { success: false; message: string };

const DAY_CODE_MAP: Record<TrainingDay, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

export async function saveWeeklyTrainingDays(
  days: TrainingDay[],
): Promise<SaveWeeklyTrainingDaysResult> {
  if (!Array.isArray(days) || days.length === 0) {
    return {
      success: false,
      message: "En az bir antrenman günü seçmelisiniz.",
    };
  }

  const uniqueDays = [...new Set(days)];
  const dayCodes = uniqueDays.map((day) => DAY_CODE_MAP[day]);

  const { data, error } = await supabase.rpc("save_onboarding_weekly_goal", {
    p_days: dayCodes,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  // login.tsx (ve Google OAuth girişi) kullanıcıyı onboarding'e mi yoksa
  // ana ekrana mı yönlendireceğine bu auth metadata bayrağına bakarak karar
  // veriyor; DB tarafındaki user_onboarding_status.completed zaten RPC
  // tarafından işaretlendi, burada login akışının okuduğu alanı da senkron
  // tutuyoruz.
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  });

  if (metadataError) {
    return { success: false, message: metadataError.message };
  }

  const weeklyGoal = (data?.[0]?.weekly_goal as number | undefined) ?? uniqueDays.length;

  return { success: true, weeklyGoal };
}

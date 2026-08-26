import i18n from "@/shared/i18n";
import { supabase } from "@/shared/lib/supabase";

export const FITNESS_PREFERENCES = ["cardio", "strength", "flexibility"] as const;

export type FitnessPreference = (typeof FITNESS_PREFERENCES)[number];

export type SaveFitnessPreferencesResult =
  | {
      success: true;
      preferences: FitnessPreference[];
    }
  | {
      success: false;
      message: string;
    };

function validatePreferences(
  preferences: string[],
): SaveFitnessPreferencesResult {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    return {
      success: false,
      message: i18n.t("onboarding.fitnessExperience.atLeastOneRequired"),
    };
  }

  const uniquePreferences = [...new Set(preferences)];

  const hasInvalidPreference = uniquePreferences.some(
    (preference) => !FITNESS_PREFERENCES.includes(preference as FitnessPreference),
  );

  if (hasInvalidPreference) {
    return {
      success: false,
      message: i18n.t("onboarding.fitnessExperience.invalidPreference"),
    };
  }

  return {
    success: true,
    preferences: uniquePreferences as FitnessPreference[],
  };
}

export async function saveFitnessPreferences(
  preferences: string[],
): Promise<SaveFitnessPreferencesResult> {
  const validation = validatePreferences(preferences);

  if (!validation.success) {
    return validation;
  }

  const { data, error } = await supabase.rpc("save_onboarding_fitness_focus", {
    p_focus_areas: validation.preferences,
  });

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  const savedFocusAreas = data?.[0]?.focus_areas as FitnessPreference[] | undefined;

  return {
    success: true,
    preferences: savedFocusAreas ?? validation.preferences,
  };
}

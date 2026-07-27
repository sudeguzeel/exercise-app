import { supabase } from "@/shared/lib/supabase";

export const FITNESS_PREFERENCES = [
    "cardio",
    "strength",
    "flexibility",
] as const;

export type FitnessPreference =
    (typeof FITNESS_PREFERENCES)[number];

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
            message: "En az bir fitness tercihi seçilmelidir.",
        };
    }

    const uniquePreferences = [...new Set(preferences)];

    const hasInvalidPreference = uniquePreferences.some(
        (preference) =>
            !FITNESS_PREFERENCES.includes(
                preference as FitnessPreference,
            ),
    );

    if (hasInvalidPreference) {
        return {
            success: false,
            message: "Tanımlı olmayan bir fitness tercihi gönderildi.",
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

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            success: false,
            message: "Oturum açmış kullanıcı bulunamadı.",
        };
    }

    const { data, error } = await supabase
        .from("user_fitness_preferences")
        .upsert(
            {
                user_id: user.id,
                preferences: validation.preferences,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id",
            },
        )
        .select("preferences")
        .single();

    if (error) {
        return {
            success: false,
            message: error.message,
        };
    }

    return {
        success: true,
        preferences: data.preferences as FitnessPreference[],
    };
}

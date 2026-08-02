import type { Gender, Goal, PersonalInfo } from "@/providers/OnboardingContext";
import { supabase } from "@/shared/lib/supabase";

export type SavePersonalInfoResult =
  | { success: true }
  | { success: false; message: string };

const GENDER_MAP: Record<
  Exclude<Gender, "">,
  "male" | "female" | "prefer_not_to_say"
> = {
  male: "male",
  female: "female",
  other: "prefer_not_to_say",
};

// personal-info.tsx ekranindaki goalOptions ve OnboardingContext'teki Goal tipi
// sadece bu ucu tanimliyor/sunuyor.
const GOAL_MAP: Record<
  "build-muscle" | "lose-weight" | "stay-fit",
  "muscle_gain" | "fat_loss" | "general_fitness"
> = {
  "build-muscle": "muscle_gain",
  "lose-weight": "fat_loss",
  "stay-fit": "general_fitness",
};

function isMappedGoal(goal: Goal): goal is keyof typeof GOAL_MAP {
  return goal === "build-muscle" || goal === "lose-weight" || goal === "stay-fit";
}

function parseBirthDateToIso(value: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null;
  }

  const [dayText, monthText, yearText] = value.split("/");

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${year}-${pad(month)}-${pad(day)}`;
}

export async function savePersonalInfo(
  personalInfo: PersonalInfo,
): Promise<SavePersonalInfoResult> {
  if (!personalInfo.gender) {
    return { success: false, message: "Cinsiyet seçimi zorunludur." };
  }

  const gender = GENDER_MAP[personalInfo.gender];

  if (!isMappedGoal(personalInfo.goal)) {
    return { success: false, message: "Geçerli bir hedef seçilmedi." };
  }

  const goal = GOAL_MAP[personalInfo.goal];

  const fullName = personalInfo.fullName.trim();

  if (!fullName) {
    return { success: false, message: "Ad Soyad alanı zorunludur." };
  }

  const isoBirthDate = parseBirthDateToIso(personalInfo.birthDate);

  if (!isoBirthDate) {
    return { success: false, message: "Geçerli bir doğum tarihi giriniz." };
  }

  const height = Number(personalInfo.height);
  const currentWeight = Number(personalInfo.currentWeight);
  const targetWeight = Number(personalInfo.targetWeight);

  if (
    !Number.isFinite(height) ||
    !Number.isFinite(currentWeight) ||
    !Number.isFinite(targetWeight)
  ) {
    return { success: false, message: "Boy/kilo alanları geçerli olmalı." };
  }

  const { error } = await supabase.rpc("save_onboarding_personal_info", {
    p_gender: gender,
    p_goal: goal,
    p_full_name: fullName,
    p_birth_date: isoBirthDate,
    p_height_cm: height,
    p_current_weight_kg: currentWeight,
    p_target_weight_kg: targetWeight,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import {
  bodyPartIcon,
  translateBodyPart,
  translateEquipment,
  translateExerciseType,
  translateLevel,
  translateMuscle,
} from "@/shared/constants/exercise-taxonomy";
import { supabase } from "@/shared/lib/supabase";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type BodyPartOption = {
  id: string;
  name: string;
  icon: IconName;
};
export type ExerciseFilterOption = {
  id: string;
  name: string;
};

export function buildMediaUrl(relativePath: string | null | undefined): string | null {
  return relativePath ?? null;
}

export type ExerciseSummary = {
  id: string;
  name: string;
  bodyPartId: string | null;
  bodyPartName: string;
  level: string | null;
  icon: IconName;
  imageUrl: string | null;
};

export type ExerciseDetail = ExerciseSummary & {
  exerciseType: string | null;
  equipmentName: string | null;
  targetMuscleName: string | null;
  secondaryMuscleNames: string[];
  isWeightBased: boolean;
  steps: string[];
  description: string | null;
  recommendedSets: number | null;
  recommendedReps: number | null;
  recommendedRestSeconds: number | null;
  gifUrl: string | null;
};

export class ExerciseDetailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExerciseDetailError";
  }
}

export const EXERCISE_PAGE_SIZE = 20;

export async function getBodyParts(): Promise<BodyPartOption[]> {
  const { data, error } = await supabase
    .from("body_parts")
    .select("id, name");

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => ({
      id: row.id as string,
      name: translateBodyPart(row.name as string),
      icon: bodyPartIcon(row.name as string),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
}

export async function getEquipments(): Promise<ExerciseFilterOption[]> {
  const { data, error } = await supabase
    .from("equipments")
    .select("id, name");

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => ({
      id: row.id as string,
      name: translateEquipment(row.name as string) ?? (row.name as string),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
}

export type SearchExercisesParams = {
  search?: string;
  bodyPartId?: string | null;
  equipmentId?: string | null;
  offset: number;
  limit?: number;
};

export type SearchExercisesResult = {
  items: ExerciseSummary[];
  hasMore: boolean;
};

type ExerciseListRow = {
  id: string;
  name: string;
  body_part_id: string | null;
  body_parts: { name: string } | null;
  level: string | null;
  image: string | null;
};

export async function searchExercises({
  search,
  bodyPartId,
  equipmentId,
  offset,
  limit = EXERCISE_PAGE_SIZE,
}: SearchExercisesParams): Promise<SearchExercisesResult> {
  let query = supabase
    .from("exercises")
    .select("id, name, body_part_id, body_parts(name), level, image", {
      count: "exact",
    })
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    query = query.ilike("name", `%${trimmedSearch}%`);
  }
  if (bodyPartId) {
    query = query.eq("body_part_id", bodyPartId);
  }

if (equipmentId) {
  query = query.eq("equipment_id", equipmentId);
}
  const { data, error, count } = await query;

  if (error || !data) {
    throw error ?? new Error("Egzersizler alınamadı.");
  }

  const rows = data as unknown as ExerciseListRow[];
  const items: ExerciseSummary[] = rows.map((row) => {
    const rawBodyPartName = row.body_parts?.name ?? null;
    return {
      id: row.id,
      name: row.name,
      bodyPartId: row.body_part_id,
      bodyPartName: translateBodyPart(rawBodyPartName),
      level: translateLevel(row.level),
      icon: bodyPartIcon(rawBodyPartName),
      imageUrl: buildMediaUrl(row.image),
    };
  });

  const hasMore =
    count !== null ? offset + items.length < count : items.length === limit;

  return { items, hasMore };
}

type ExerciseDetailRow = {
  id: string;
  name: string;
  body_part_id: string | null;
  body_parts: { name: string } | null;
  level: string | null;
  exercise_type: string | null;
  recommended_sets: number | null;
  recommended_reps: number | null;
  recommended_rest_seconds: number | null;
  equipments: { name: string; is_weight_based: boolean } | null;
  target_muscle: { name: string } | null;
  exercise_steps: { step_order: number; description: string }[] | null;
  secondary_muscles: { muscles: { name: string } | null }[] | null;
  image: string | null;
  gif_url: string | null;
};

export async function getExerciseDetail(
  exerciseId: string,
): Promise<ExerciseDetail | null> {
  const trimmedId = exerciseId?.trim();
  if (!trimmedId) {
    return null;
  }

  const { data, error } = await supabase
    .from("exercises")
    .select(
      [
        "id",
        "name",
        "body_part_id",
        "body_parts(name)",
        "level",
        "exercise_type",
        "recommended_sets",
        "recommended_reps",
        "recommended_rest_seconds",
        "equipments(name, is_weight_based)",
        "target_muscle:muscles!exercises_target_muscle_id_fkey(name)",
        "exercise_steps(step_order, description)",
        "secondary_muscles(muscles(name))",
        "image",
        "gif_url",
      ].join(", "),
    )
    .eq("id", trimmedId)
    .maybeSingle();

  if (error) {
    throw new ExerciseDetailError(
      `Egzersiz detayı alınamadı: ${error.message}`,
    );
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as ExerciseDetailRow;
  const rawBodyPartName = row.body_parts?.name ?? null;

  const steps = (row.exercise_steps ?? [])
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => step.description);
  const description = steps.length > 0 ? steps.join(" ") : null;

  const secondaryMuscleNames = (row.secondary_muscles ?? [])
    .map((entry) => translateMuscle(entry.muscles?.name))
    .filter((name): name is string => Boolean(name));

  return {
    id: row.id,
    name: row.name,
    bodyPartId: row.body_part_id,
    bodyPartName: translateBodyPart(rawBodyPartName),
    level: translateLevel(row.level),
    icon: bodyPartIcon(rawBodyPartName),
    imageUrl: buildMediaUrl(row.image),
    exerciseType: translateExerciseType(row.exercise_type),
    equipmentName: translateEquipment(row.equipments?.name),
    isWeightBased: row.equipments?.is_weight_based ?? false,
    targetMuscleName: translateMuscle(row.target_muscle?.name),
    secondaryMuscleNames,
    steps,
    description,
    recommendedSets: row.recommended_sets,
    recommendedReps: row.recommended_reps,
    recommendedRestSeconds: row.recommended_rest_seconds,
    gifUrl: buildMediaUrl(row.gif_url),
  };
}

export async function getExerciseSummary(
  exerciseId: string,
): Promise<ExerciseSummary | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, body_part_id, body_parts(name), level, image")
    .eq("id", exerciseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as ExerciseListRow;
  const rawBodyPartName = row.body_parts?.name ?? null;

  return {
    id: row.id,
    name: row.name,
    bodyPartId: row.body_part_id,
    bodyPartName: translateBodyPart(rawBodyPartName),
    level: translateLevel(row.level),
    icon: bodyPartIcon(rawBodyPartName),
    imageUrl: buildMediaUrl(row.image),
  };
}

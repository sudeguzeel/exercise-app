import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import {
  bodyPartIcon,
  translateBodyPart,
  translateEquipment,
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

export type ExerciseSummary = {
  id: string;
  name: string;
  bodyPartId: string | null;
  bodyPartName: string;
  // exercises.level su an veri setinde dolu degil (bkz. taxonomy dosyasindaki
  // not); alan her zaman response'da bulunur ama deger null olabilir.
  level: string | null;
  icon: IconName;
};

export type ExerciseDetail = ExerciseSummary & {
  equipmentName: string | null;
  targetMuscleName: string | null;
  secondaryMuscleNames: string[];
  steps: string[];
};

// exercises tablosunda 1324 satır var; kataloğu tek seferde çekmek yerine
// gerçek DB sorgularıyla arama + kategori filtresi + sayfalama (range) yapılır.
export const EXERCISE_PAGE_SIZE = 20;

/**
 * body_parts tablosundan (10 satır) Türkçe'ye çevrilmiş, alfabetik sıralı
 * kategori listesi döner. Hem "Egzersizler" sekmesindeki filtre çipleri hem
 * "Yeni program" ekranındaki "odaklanılan kas grupları" seçimi bunu kullanır.
 */
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

export type SearchExercisesParams = {
  search?: string;
  bodyPartId?: string | null;
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
};

/**
 * exercises tablosunda isme göre arama + vücut bölgesine göre filtre +
 * sayfalama yapar (Supabase `.range()`). "Egzersizler" ekranındaki
 * infinite-scroll listesi bunu her sayfa için çağırır.
 */
export async function searchExercises({
  search,
  bodyPartId,
  offset,
  limit = EXERCISE_PAGE_SIZE,
}: SearchExercisesParams): Promise<SearchExercisesResult> {
  let query = supabase
    .from("exercises")
    .select("id, name, body_part_id, body_parts(name), level", {
      count: "exact",
    })
    // "name" tek başına sıralama anahtarı olarak yeterli değil: aynı isimde
    // birden fazla egzersiz varsa Postgres'in sayfalar arası sırası garanti
    // olmaz (aynı satır iki sayfada tekrar edebilir ya da hiç dönmeyebilir).
    // "id" ikincil anahtar olarak eklenince sıralama deterministik olur.
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

  const { data, error, count } = await query;

  if (error || !data) {
    return { items: [], hasMore: false };
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
  equipments: { name: string } | null;
  // exercises tablosunda muscles'a iki ayrı FK var (target_muscle_id,
  // muscle_group_id); Supabase embed'inde hangi ilişkinin kastedildiğini
  // constraint adıyla belirtmek gerekiyor.
  target_muscle: { name: string } | null;
  exercise_steps: { step_order: number; description: string }[] | null;
  secondary_muscles: { muscles: { name: string } | null }[] | null;
};

/**
 * Tek bir egzersizin tüm detayını (hedef/ikincil kaslar, ekipman, adım adım
 * açıklama) getirir. Egzersiz kartına tıklandığında exercise-detail.tsx
 * bunu çağırır.
 */
export async function getExerciseDetail(
  exerciseId: string,
): Promise<ExerciseDetail | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      [
        "id",
        "name",
        "body_part_id",
        "body_parts(name)",
        "level",
        "equipments(name)",
        "target_muscle:muscles!exercises_target_muscle_id_fkey(name)",
        "exercise_steps(step_order, description)",
        "secondary_muscles(muscles(name))",
      ].join(", "),
    )
    .eq("id", exerciseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as ExerciseDetailRow;
  const rawBodyPartName = row.body_parts?.name ?? null;

  const steps = (row.exercise_steps ?? [])
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => step.description);

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
    equipmentName: translateEquipment(row.equipments?.name),
    targetMuscleName: translateMuscle(row.target_muscle?.name),
    secondaryMuscleNames,
    steps,
  };
}

/**
 * exercise-detail/program-selection/new-program ekranları egzersiz adı ve
 * ikonunu göstermek için sadece küçük bir özet yeterli olduğunda bunu
 * kullanır (tam detay sorgusuna göre daha hafif).
 */
export async function getExerciseSummary(
  exerciseId: string,
): Promise<ExerciseSummary | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, body_part_id, body_parts(name), level")
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
  };
}

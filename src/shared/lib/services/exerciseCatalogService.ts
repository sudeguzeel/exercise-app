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

// exercises.image / exercises.gif_url artık Supabase Storage'daki
// "exercise-media" bucket'ının tam public URL'ini tutuyor (bkz.
// scripts/migrate-exercise-media.js). Eski göreli path'ler
// image_original_path / gif_url_original_path kolonlarında yedekli duruyor.
// Not: görsel/gif'ler © Gym visual'a ait, kaynak repo (hasaneyldrm/
// exercises-dataset) bunları "izinle" dağıtıyor; ticari kullanım için
// gymvisual.com'un şartlarından ayrıca izin/lisans almanız gerekir (bkz.
// repo NOTICE.md).
const LEGACY_EXERCISE_MEDIA_BASE_URL =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";

export function buildMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  return `${LEGACY_EXERCISE_MEDIA_BASE_URL}${relativePath}`;
}

export type ExerciseSummary = {
  id: string;
  name: string;
  bodyPartId: string | null;
  bodyPartName: string;
  // exercises.level su an veri setinde dolu degil (bkz. taxonomy dosyasindaki
  // not); alan her zaman response'da bulunur ama deger null olabilir.
  level: string | null;
  icon: IconName;
  // 180x180 küçük resim; her egzersizde var (bkz. buildMediaUrl notu).
  imageUrl: string | null;
};

export type ExerciseDetail = ExerciseSummary & {
  exerciseType: string | null;
  equipmentName: string | null;
  targetMuscleName: string | null;
  secondaryMuscleNames: string[];
  // equipments.is_weight_based — egzersizin ekipmanı harici bir ağırlıkla
  // (barbell/dumbbell/kettlebell vb.) yapılıyor mu. "Hareket Ağırlıkların"
  // (bkz. progress-service.loadExerciseWeightItems) sadece bu true olan
  // egzersizleri listeler — body weight/kardiyo makinesi gibi "kaç kg"
  // sorusunun anlamsız olduğu ekipmanlar orada görünmez.
  isWeightBased: boolean;
  // exercise_steps'ten (step_order'a göre sıralı) elde edilen adım adım
  // açıklama listesi.
  steps: string[];
  // steps'in tek paragrafta birleştirilmiş hali; hiç adım yoksa null.
  description: string | null;
  // exercises.recommended_* şu an veri setinde dolu değil, hepsi null
  // dönebilir (bkz. add_exercise_type_and_recommended_values migration'ı).
  recommendedSets: number | null;
  recommendedReps: number | null;
  recommendedRestSeconds: number | null;
  // Hareket animasyonu (gif); her egzersizde var.
  gifUrl: string | null;
};

export class ExerciseDetailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExerciseDetailError";
  }
}

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
  image: string | null;
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
    .select("id, name, body_part_id, body_parts(name), level, image", {
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
  // exercises tablosunda muscles'a iki ayrı FK var (target_muscle_id,
  // muscle_group_id); Supabase embed'inde hangi ilişkinin kastedildiğini
  // constraint adıyla belirtmek gerekiyor.
  target_muscle: { name: string } | null;
  exercise_steps: { step_order: number; description: string }[] | null;
  secondary_muscles: { muscles: { name: string } | null }[] | null;
  image: string | null;
  gif_url: string | null;
};

/**
 * Tek bir egzersizin tüm detayını (hedef/ikincil kaslar, ekipman, adım adım
 * açıklama, önerilen değerler) getirir. Egzersiz kartına tıklandığında
 * exercise-detail.tsx bunu çağırır.
 *
 * Dönüş sözleşmesi:
 * - Geçerli bir id ile eşleşen kayıt bulunamazsa `null` döner (ekran
 *   "Egzersiz bulunamadı" durumunu gösterir).
 * - Sorgu gerçekten başarısız olursa (ağ/DB hatası) `ExerciseDetailError`
 *   fırlatır — çağıran taraf bunu "not found" ile karıştırmamalı, ayrı bir
 *   hata/yeniden-dene durumu göstermeli.
 * - Boş/geçersiz (örn. boş string) id ile çağrılırsa da `null` döner.
 */
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
    // Sorgu başarılı ama eşleşen kayıt yok — geçersiz/bulunamayan id.
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

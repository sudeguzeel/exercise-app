import {
  bodyPartIcon,
  translateBodyPart,
  translateLevel,
} from "@/shared/constants/exercise-taxonomy";
import { buildMediaUrl } from "@/shared/lib/services/exerciseCatalogService";
import { supabase } from "@/shared/lib/supabase";
import type { ExerciseSummary } from "@/shared/lib/services/exerciseCatalogService";

export type FavoriteExerciseErrorCode = "AUTH_REQUIRED" | "REQUEST_FAILED";

export class FavoriteExerciseError extends Error {
  constructor(
    public readonly code: FavoriteExerciseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "FavoriteExerciseError";
  }
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new FavoriteExerciseError("AUTH_REQUIRED", "Oturum bulunamadı.");
  }

  return user.id;
}

type FavoriteExerciseRow = {
  exercise_id: string;
  exercises: {
    id: string;
    name: string;
    body_part_id: string | null;
    body_parts: { name: string } | null;
    level: string | null;
    image: string | null;
  } | null;
};

/**
 * user_favorite_exercises + exercises join'inden, en son favorilenen en
 * üstte olacak şekilde (created_at desc) kullanıcının favori listesini
 * getirir. RLS zaten sadece auth.uid() = user_id satırlarını döndürür.
 */
export async function listFavoriteExercises(): Promise<ExerciseSummary[]> {
  const { data, error } = await supabase
    .from("user_favorite_exercises")
    .select(
      "exercise_id, exercises(id, name, body_part_id, body_parts(name), level, image)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    throw new FavoriteExerciseError(
      "REQUEST_FAILED",
      "Favoriler alınamadı.",
    );
  }

  const rows = data as unknown as FavoriteExerciseRow[];

  return rows
    .filter((row): row is FavoriteExerciseRow & { exercises: NonNullable<FavoriteExerciseRow["exercises"]> } =>
      Boolean(row.exercises),
    )
    .map((row) => {
      const exercise = row.exercises;
      const rawBodyPartName = exercise.body_parts?.name ?? null;

      return {
        id: exercise.id,
        name: exercise.name,
        bodyPartId: exercise.body_part_id,
        bodyPartName: translateBodyPart(rawBodyPartName),
        level: translateLevel(exercise.level),
        icon: bodyPartIcon(rawBodyPartName),
        imageUrl: buildMediaUrl(exercise.image),
      };
    });
}

/**
 * Favorilere ekler. Aynı egzersiz için tekrar çağrılırsa (aynı user_id +
 * exercise_id çifti unique constraint'e takılır) bunu hata saymayız —
 * sonuç zaten istenen durumla (favoride) aynı.
 */
export async function addFavoriteExercise(exerciseId: string): Promise<void> {
  const userId = await requireUserId();

  const { error } = await supabase
    .from("user_favorite_exercises")
    .insert({ user_id: userId, exercise_id: exerciseId });

  if (error && error.code !== "23505") {
    throw new FavoriteExerciseError(
      "REQUEST_FAILED",
      "Favorilere eklenemedi.",
    );
  }
}

export async function removeFavoriteExercise(
  exerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_favorite_exercises")
    .delete()
    .eq("exercise_id", exerciseId);

  if (error) {
    throw new FavoriteExerciseError(
      "REQUEST_FAILED",
      "Favorilerden çıkarılamadı.",
    );
  }
}

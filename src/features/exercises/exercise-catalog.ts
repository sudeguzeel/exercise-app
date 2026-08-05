import type {
  BodyPartOption,
  ExerciseSummary,
} from "@/shared/lib/services/exerciseCatalogService";

// Arama ve vücut-bölgesi filtresi artık exerciseCatalogService.searchExercises
// içinde gerçek bir Supabase sorgusu olarak yapılıyor (bkz. (main)/exercise.tsx);
// bu dosya sadece sunucudan gelen sonuçları ekranın beklediği şekle taşıyan
// ince bir katman.
export type ExerciseListItem = ExerciseSummary;

export type ExerciseCategoryFilter = {
  id: string | null;
  name: string;
};

export function buildCategoryFilters(
  bodyParts: BodyPartOption[],
): ExerciseCategoryFilter[] {
  return [{ id: null, name: "Tümü" }, ...bodyParts];
}

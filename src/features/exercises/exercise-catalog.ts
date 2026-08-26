import type {
  BodyPartOption,
  ExerciseSummary,
} from "@/shared/lib/services/exerciseCatalogService";

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

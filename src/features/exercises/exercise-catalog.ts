import type {
  Exercise,
  ExerciseCategory,
} from "@/shared/lib/home-dashboard";

export type ExerciseListItem = Exercise & {
  categoryName: string;
};

export type ExerciseCategoryFilter = {
  id: string | null;
  name: string;
};

export function buildExerciseList(
  exercises: Exercise[],
  categories: ExerciseCategory[],
): ExerciseListItem[] {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return exercises.map((exercise) => ({
    ...exercise,
    categoryName: categoryNames.get(exercise.categoryId) ?? exercise.categoryId,
  }));
}

export function buildCategoryFilters(
  categories: ExerciseCategory[],
): ExerciseCategoryFilter[] {
  const seenCategoryIds = new Set<string>();
  const uniqueCategories = categories.filter((category) => {
    if (seenCategoryIds.has(category.id)) return false;
    seenCategoryIds.add(category.id);
    return true;
  });

  return [
    { id: null, name: "Tümü" },
    ...uniqueCategories.map(({ id, name }) => ({ id, name })),
  ];
}

export function filterExercises(
  exercises: ExerciseListItem[],
  searchText: string,
  selectedCategoryId: string | null,
): ExerciseListItem[] {
  const normalizedSearch = normalizeSearchValue(searchText);

  return exercises.filter((exercise) => {
    const matchesName =
      normalizedSearch.length === 0 ||
      normalizeSearchValue(exercise.name).includes(normalizedSearch);
    const matchesCategory =
      selectedCategoryId === null ||
      exercise.categoryId === selectedCategoryId;

    return matchesName && matchesCategory;
  });
}

function normalizeSearchValue(value: string): string {
  return value.trim().normalize("NFC").toLocaleLowerCase("tr-TR");
}

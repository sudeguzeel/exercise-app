import {
  MOCK_DAILY_PLAN_TEMPLATES,
  MOCK_EXERCISE_CATEGORIES,
  MOCK_EXERCISE_RECORD_TEMPLATES,
  MOCK_EXERCISES,
} from "@/shared/constants/home-mock-data";
import {
  dateForDayOfWeek,
  type Exercise,
  type ExerciseCategory,
  type HomeSourceData,
} from "@/shared/lib/home-dashboard";

export type ExerciseCatalogData = {
  categories: ExerciseCategory[];
  exercises: Exercise[];
};

export function getExerciseCatalog(): ExerciseCatalogData {
  return {
    categories: MOCK_EXERCISE_CATEGORIES,
    exercises: MOCK_EXERCISES,
  };
}

export function getHomeSourceData(referenceDate = new Date()): HomeSourceData {
  return {
    categories: MOCK_EXERCISE_CATEGORIES,
    exercises: MOCK_EXERCISES,
    plans: MOCK_DAILY_PLAN_TEMPLATES.map(({ dayOfWeek, ...plan }) => ({
      ...plan,
      date: dateForDayOfWeek(referenceDate, dayOfWeek),
    })),
    records: MOCK_EXERCISE_RECORD_TEMPLATES.map(
      ({ dayOfWeek, ...record }) => ({
        ...record,
        date: dateForDayOfWeek(referenceDate, dayOfWeek),
      }),
    ),
  };
}

export function getExerciseById(exerciseId: string): Exercise | undefined {
  return MOCK_EXERCISES.find((exercise) => exercise.id === exerciseId);
}

export function getExerciseCategoryName(categoryId: string) {
  return MOCK_EXERCISE_CATEGORIES.find((category) => category.id === categoryId)
    ?.name;
}

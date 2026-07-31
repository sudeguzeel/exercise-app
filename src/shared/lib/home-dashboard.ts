import type { TrainingDay } from "@/context/OnboardingContext";
import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type ExerciseStatus = "completed" | "partial" | "not_started";
export type ExerciseLevel = "Başlangıç" | "Orta seviye" | "İleri seviye";
export type ExerciseType = "Bileşik" | "İzolasyon" | "Mobilite" | "Kardiyo";
export type TargetDayStatus =
  | "completed"
  | "missed"
  | "today"
  | "upcoming"
  | "rest";

export type ExerciseCategory = {
  id: string;
  name: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};
export type Exercise = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  level: ExerciseLevel;
  image: ComponentProps<typeof Ionicons>["name"];
  animationUri?: string;
  exerciseType: ExerciseType;
  primaryMuscle: string;
  secondaryMuscles: string[];
  recommendedSets: number;
  recommendedReps: string;
  recommendedRestSeconds: number;
};
export type PlannedExercise = {
  exerciseId: string;
  sets: number;
  reps: number;
};
export type DailyPlanTemplate = {
  id: string;
  dayOfWeek: number;
  exercises: PlannedExercise[];
};
export type ExerciseRecordTemplate = {
  dayOfWeek: number;
  exerciseId: string;
  status: ExerciseStatus;
  completedMovementCount: number;
};
export type DailyWorkoutPlan = Omit<DailyPlanTemplate, "dayOfWeek"> & {
  date: string;
};
export type ExerciseRecord = Omit<ExerciseRecordTemplate, "dayOfWeek"> & {
  date: string;
};
export type HomeSourceData = {
  categories: ExerciseCategory[];
  exercises: Exercise[];
  plans: DailyWorkoutPlan[];
  records: ExerciseRecord[];
};
export type CategoryTotal = ExerciseCategory & { value: number };
export type DailyTotal = {
  id: TrainingDay;
  date: string;
  label: string;
  value: number;
};
export type TargetDay = DailyTotal & { status: TargetDayStatus };
export type ProgramExercise = PlannedExercise & {
  exercise: Exercise;
  status: ExerciseStatus;
};
export type HomeDashboard = {
  weekStart: string;
  weekEnd: string;
  weeklyTotal: number;
  categoryTotals: CategoryTotal[];
  dailyTotals: DailyTotal[];
  targetDays: TargetDay[];
  streakDays: number;
  todayProgram: ProgramExercise[];
  isRestDay: boolean;
};

const DAY_META: { id: TrainingDay; label: string }[] = [
  { id: "monday", label: "Pzt" },
  { id: "tuesday", label: "Sal" },
  { id: "wednesday", label: "Çar" },
  { id: "thursday", label: "Per" },
  { id: "friday", label: "Cum" },
  { id: "saturday", label: "Cmt" },
  { id: "sunday", label: "Paz" },
];

export function startOfWeek(referenceDate: Date) {
  const date = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function endOfWeek(referenceDate: Date) {
  return addDays(startOfWeek(referenceDate), 6);
}

export function dateForDayOfWeek(referenceDate: Date, dayOfWeek: number) {
  return toDateKey(addDays(startOfWeek(referenceDate), dayOfWeek - 1));
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildHomeDashboard(
  source: HomeSourceData,
  trainingDays: TrainingDay[],
  referenceDate = new Date(),
): HomeDashboard {
  const weekStartDate = startOfWeek(referenceDate);
  const weekStart = toDateKey(weekStartDate);
  const weekEnd = toDateKey(endOfWeek(referenceDate));
  const today = toDateKey(referenceDate);
  const plans = source.plans.filter(
    (plan) => plan.date >= weekStart && plan.date <= weekEnd,
  );
  const records = source.records.filter(
    (record) => record.date >= weekStart && record.date <= weekEnd,
  );
  const completedRecords = records.filter(
    (record) => record.status === "completed",
  );
  const exerciseById = new Map(
    source.exercises.map((exercise) => [exercise.id, exercise]),
  );
  const weeklyTotal = completedRecords.reduce(
    (total, record) => total + record.completedMovementCount,
    0,
  );
  const categoryTotals = source.categories.map((category) => ({
    ...category,
    value: completedRecords.reduce((total, record) => {
      const exercise = exerciseById.get(record.exerciseId);
      return exercise?.categoryId === category.id
        ? total + record.completedMovementCount
        : total;
    }, 0),
  }));
  const dailyTotals = DAY_META.map((day, index) => {
    const date = toDateKey(addDays(weekStartDate, index));
    const value = completedRecords
      .filter((record) => record.date === date)
      .reduce((total, record) => total + record.completedMovementCount, 0);
    return { ...day, date, value };
  });
  const targetDays = dailyTotals
    .filter((day) => trainingDays.includes(day.id))
    .map((day) => {
      const plan = plans.find((item) => item.date === day.date);
      return {
        ...day,
        status: getTargetDayStatus(plan, records, day.date, today),
      };
    });
  const todayPlan = plans.find((plan) => plan.date === today);
  const todayProgram =
    todayPlan?.exercises
      .map((plannedExercise) => {
        const exercise = exerciseById.get(plannedExercise.exerciseId);
        if (!exercise) return null;
        const record = records.find(
          (item) =>
            item.date === today &&
            item.exerciseId === plannedExercise.exerciseId,
        );
        return {
          ...plannedExercise,
          exercise,
          status: record?.status ?? "not_started",
        };
      })
      .filter((item): item is ProgramExercise => item !== null) ?? [];

  return {
    weekStart,
    weekEnd,
    weeklyTotal,
    categoryTotals,
    dailyTotals,
    targetDays,
    streakDays: calculateStreak(plans, records, today),
    todayProgram,
    isRestDay: !todayPlan,
  };
}

function getTargetDayStatus(
  plan: DailyWorkoutPlan | undefined,
  records: ExerciseRecord[],
  date: string,
  today: string,
): TargetDayStatus {
  if (!plan) return "rest";
  if (date > today) return "upcoming";
  if (isPlanCompleted(plan, records)) return "completed";
  if (date < today) return "missed";
  return "today";
}

function calculateStreak(
  plans: DailyWorkoutPlan[],
  records: ExerciseRecord[],
  today: string,
) {
  const eligiblePlans = plans
    .filter((plan) => plan.date <= today)
    .sort((left, right) => right.date.localeCompare(left.date));
  let streak = 0;
  for (const plan of eligiblePlans) {
    if (plan.date === today && !isPlanCompleted(plan, records)) continue;
    if (!isPlanCompleted(plan, records)) break;
    streak += 1;
  }
  return streak;
}

function isPlanCompleted(
  plan: DailyWorkoutPlan,
  records: ExerciseRecord[],
) {
  return (
    plan.exercises.length > 0 &&
    plan.exercises.every((plannedExercise) =>
      records.some(
        (record) =>
          record.date === plan.date &&
          record.exerciseId === plannedExercise.exerciseId &&
          record.status === "completed",
      ),
    )
  );
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

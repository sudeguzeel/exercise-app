import type { TrainingDay } from "@/providers/OnboardingContext";
import type { PersistedProgramExercise, UserProgram } from "@/features/programs/types";
import type { BodyPartOption } from "@/shared/lib/services/exerciseCatalogService";
import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type ExerciseStatus = "completed" | "not_started";
export type TargetDayStatus =
  | "completed"
  | "missed"
  | "today"
  | "upcoming"
  | "rest";

export type ExerciseNameLookup = Map<
  string,
  {
    name: string;
    icon: ComponentProps<typeof Ionicons>["name"];
    bodyPartId: string | null;
  }
>;

// user_completed_exercises tablosundan gelen tek bir tamamlanma kaydı.
export type CompletedExerciseRecord = {
  exerciseId: string;
  programExerciseId: string;
  workoutDate: string;
};

export type CategoryTotal = BodyPartOption & { value: number };

export type DailyTotal = {
  id: TrainingDay;
  date: string;
  label: string;
  value: number;
};

export type TargetDay = DailyTotal & { status: TargetDayStatus };

export type TodayProgramExercise = PersistedProgramExercise & {
  programId: string;
  programName: string;
  exerciseName: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  status: ExerciseStatus;
};

export type HomeDashboard = {
  weekStart: string;
  weekEnd: string;
  weeklyTotal: number;
  categoryTotals: CategoryTotal[];
  dailyTotals: DailyTotal[];
  targetDays: TargetDay[];
  programExercisesByDay: Record<TrainingDay, TodayProgramExercise[]>;
  streakDays: number;
  todayProgram: TodayProgramExercise[];
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

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

/**
 * DAY_META sırasındaki index (0=Pzt) için haftanın o gününde antrenmanı olan
 * programları döner (bir programın training_days'i birden çok gün içerebilir,
 * bir gün birden çok programa ait olabilir).
 */
function programsForDay(programs: UserProgram[], dayId: TrainingDay) {
  return programs.filter((program) => program.trainingDays.includes(dayId));
}

/**
 * Mock veri döneminde her gün için tek bir "plan" vardı; gerçek veride bir
 * gün birden fazla programa ait olabildiği için o günün toplam egzersiz
 * sayısı, o gün antrenmanı olan tüm programların egzersizlerinin toplamıdır.
 */
function exerciseCountForDay(programs: UserProgram[], dayId: TrainingDay) {
  return programsForDay(programs, dayId).reduce(
    (total, program) => total + program.exercises.length,
    0,
  );
}

function isDayCompleted(
  programs: UserProgram[],
  dayId: TrainingDay,
  date: string,
  completedByProgramExerciseAndDate: Set<string>,
) {
  const dayPrograms = programsForDay(programs, dayId);
  const allExercises = dayPrograms.flatMap((program) => program.exercises);
  if (allExercises.length === 0) return false;

  return allExercises.every((exercise) =>
    completedByProgramExerciseAndDate.has(`${exercise.id}|${date}`),
  );
}

export function buildHomeDashboard(
  programs: UserProgram[],
  completedRecords: CompletedExerciseRecord[],
  exerciseLookup: ExerciseNameLookup,
  categories: BodyPartOption[],
  referenceDate = new Date(),
): HomeDashboard {
  const weekStartDate = startOfWeek(referenceDate);
  const weekStart = toDateKey(weekStartDate);
  const weekEnd = toDateKey(endOfWeek(referenceDate));
  const today = toDateKey(referenceDate);

  const weekRecords = completedRecords.filter(
    (record) => record.workoutDate >= weekStart && record.workoutDate <= weekEnd,
  );
  const completedKeySet = new Set(
    completedRecords.map((record) => `${record.programExerciseId}|${record.workoutDate}`),
  );

  const weeklyTotal = weekRecords.length;

  const categoryTotals: CategoryTotal[] = categories.map((category) => {
    const value = weekRecords.reduce((total, record) => {
      const exercise = exerciseLookup.get(record.exerciseId);
      return exercise?.bodyPartId === category.id ? total + 1 : total;
    }, 0);
    return { ...category, value };
  });

  const dailyTotals: DailyTotal[] = DAY_META.map((day, index) => {
    const date = toDateKey(addDays(weekStartDate, index));
    const value =
      date <= today ? weekRecords.filter((record) => record.workoutDate === date).length : 0;
    return { ...day, date, value };
  });

  const targetDays: TargetDay[] = dailyTotals
    .filter((day) => exerciseCountForDay(programs, day.id) > 0)
    .map((day) => {
      const hasExercises = exerciseCountForDay(programs, day.id) > 0;
      let status: TargetDayStatus;
      if (!hasExercises) {
        status = "rest";
      } else if (day.date > today) {
        status = "upcoming";
      } else if (isDayCompleted(programs, day.id, day.date, completedKeySet)) {
        status = "completed";
      } else if (day.date < today) {
        status = "missed";
      } else {
        status = "today";
      }
      return { ...day, status };
    });

  const programExercisesByDay = Object.fromEntries(
    dailyTotals.map((day) => [
      day.id,
      programsForDay(programs, day.id).flatMap((program) =>
        program.exercises.map((exercise) => {
          const lookup = exerciseLookup.get(exercise.exerciseId);
          const isCompleted = completedKeySet.has(`${exercise.id}|${day.date}`);
          return {
            ...exercise,
            programId: program.id,
            programName: program.name,
            exerciseName: lookup?.name ?? exercise.exerciseId,
            icon: lookup?.icon ?? "fitness-outline",
            status: isCompleted ? "completed" : "not_started",
          } satisfies TodayProgramExercise;
        }),
      ),
    ]),
  ) as Record<TrainingDay, TodayProgramExercise[]>;

  const todayDayId = DAY_META[(new Date(referenceDate).getDay() + 6) % 7].id;
  const todayProgramExercises = programExercisesByDay[todayDayId];

  return {
    weekStart,
    weekEnd,
    weeklyTotal,
    categoryTotals,
    dailyTotals,
    targetDays,
    programExercisesByDay,
    streakDays: calculateStreakFromKeys(programs, completedKeySet, today),
    todayProgram: todayProgramExercises,
    isRestDay: todayProgramExercises.length === 0,
  };
}

export function calculateStreakDays(
  programs: UserProgram[],
  completedRecords: CompletedExerciseRecord[],
  referenceDateKey: string,
) {
  return calculateStreakFromKeys(
    programs,
    new Set(
      completedRecords.map(
        (record) => `${record.programExerciseId}|${record.workoutDate}`,
      ),
    ),
    referenceDateKey,
  );
}

function calculateStreakFromKeys(
  programs: UserProgram[],
  completedKeySet: Set<string>,
  today: string,
) {
  let streak = 0;
  let cursor = new Date(`${today}T12:00:00`);

  // Bugünden geriye doğru, o günün planı tamamlanmışsa seriye ekle;
  // planlanmış ama tamamlanmamış bir güne rastlarsa seri biter. En fazla
  // 60 gün geriye bakılır (sonsuz döngüyü önlemek için güvenlik sınırı).
  for (let i = 0; i < 60; i += 1) {
    const date = toDateKey(cursor);
    const dayId = DAY_META[(cursor.getDay() + 6) % 7].id;
    const hasExercises = exerciseCountForDay(programs, dayId) > 0;

    if (!hasExercises) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (isDayCompleted(programs, dayId, date, completedKeySet)) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    if (date === today) {
      // Bugünün planı henüz tamamlanmamış olabilir, seriyi bozmadan atla.
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

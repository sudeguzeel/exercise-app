import type { UserProgram } from "@/features/programs/types";
import type { WorkoutCompletion } from "@/features/workouts/types";
import { toLocalDateKey } from "@/features/workouts/workout-domain";
import type { ProgressPeriod } from "@/features/progress/types";

type PeriodBounds = {
  start: Date;
  end: Date;
  startKey: string;
  endKey: string;
};

const TRAINING_DAY_BY_INDEX = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const TURKISH_DATE = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const TURKISH_TIME = new Intl.DateTimeFormat("tr-TR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function getProgressPeriodBounds(
  period: ProgressPeriod,
  referenceDate = new Date(),
): PeriodBounds {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  let start: Date;
  let end: Date;

  if (period === "week") {
    start = new Date(year, month, referenceDate.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (period === "month") {
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0);
  } else {
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
    startKey: toLocalDateKey(start) ?? "",
    endKey: toLocalDateKey(end) ?? "",
  };
}

export function getPeriodLabel(period: ProgressPeriod) {
  if (period === "month") return "BU AY";
  if (period === "year") return "BU YIL";
  return "BU HAFTA";
}

export function filterCompletedWorkoutsByPeriod(
  completions: readonly WorkoutCompletion[],
  period: ProgressPeriod,
  referenceDate = new Date(),
) {
  const bounds = getProgressPeriodBounds(period, referenceDate);
  return completions.filter(
    (completion) =>
      completion.completedDate >= bounds.startKey &&
      completion.completedDate <= bounds.endKey,
  );
}

export function countScheduledWorkouts(
  programs: readonly UserProgram[],
  period: ProgressPeriod,
  referenceDate = new Date(),
) {
  const bounds = getProgressPeriodBounds(period, referenceDate);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23,
    59,
    59,
    999,
  );
  const lastDate = bounds.end < today ? bounds.end : today;
  let count = 0;

  for (
    let cursor = new Date(bounds.start);
    cursor <= lastDate;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const trainingDay = TRAINING_DAY_BY_INDEX[cursor.getDay()];
    count += programs.filter((program) =>
      program.trainingDays.includes(trainingDay),
    ).length;
  }

  return count;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function dayDifference(leftKey: string, rightKey: string) {
  return Math.round(
    (dateFromKey(leftKey).getTime() - dateFromKey(rightKey).getTime()) /
      86_400_000,
  );
}

export function calculateWorkoutStreaks(
  completions: readonly WorkoutCompletion[],
  referenceDate = new Date(),
) {
  const dates = [
    ...new Set(
      completions
        .filter((completion) => completion.status === "completed")
        .map((completion) => completion.completedDate),
    ),
  ].sort();

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;
  for (const date of dates) {
    runningStreak =
      previousDate && dayDifference(date, previousDate) === 1
        ? runningStreak + 1
        : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = date;
  }

  const todayKey = toLocalDateKey(referenceDate) ?? "";
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday) ?? "";
  const latestDate = dates.at(-1);
  let currentStreak = 0;
  if (latestDate === todayKey || latestDate === yesterdayKey) {
    currentStreak = 1;
    for (let index = dates.length - 1; index > 0; index -= 1) {
      if (dayDifference(dates[index], dates[index - 1]) !== 1) break;
      currentStreak += 1;
    }
  }

  return { currentStreak, longestStreak };
}

export function formatLocalWorkoutDate(
  timestamp: string,
  referenceDate = new Date(),
) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Tarih bilinmiyor";
  const dateKey = toLocalDateKey(date);
  const todayKey = toLocalDateKey(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDateKey(yesterday);
  if (dateKey === todayKey) return "BUGÜN";
  if (dateKey === yesterdayKey) return "DÜN";
  return TURKISH_DATE.format(date).toLocaleUpperCase("tr-TR");
}

export function formatLocalWorkoutTime(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? TURKISH_TIME.format(date) : "--:--";
}

export function formatRelativeUpdate(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Güncelleme zamanı bilinmiyor";
  const day = formatLocalWorkoutDate(timestamp, now);
  if (day === "BUGÜN") return "Bugün güncellendi";
  if (day === "DÜN") return "Dün güncellendi";
  return `${TURKISH_DATE.format(date)} güncellendi`;
}

export function formatDecimal(value: number | null, maximumFractionDigits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits,
  }).format(value);
}

export function formatWeightKg(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return "—";
  }
  return `${formatDecimal(value)} kg`;
}

export type CompletedWeightFallback = {
  userId: string;
  programExerciseId: string;
  exerciseId: string;
  weightKg: number;
  previousWeightKg: number | null;
  completedAt: string;
};

export function getLatestCompletedWeights(
  completions: readonly WorkoutCompletion[],
) {
  const entries = completions
    .filter((completion) => completion.status === "completed")
    .flatMap((completion) =>
      completion.exercises.flatMap((exercise) =>
        exercise.sets
          .filter(
            (set) =>
              Boolean(set.completedAt) &&
              set.weightKg !== null &&
              Number.isFinite(set.weightKg) &&
              set.weightKg >= 0,
          )
          .map((set) => ({
            userId: completion.userId,
            programExerciseId: exercise.programExerciseId,
            exerciseId: exercise.exerciseId,
            weightKg: set.weightKg as number,
            completedAt: set.completedAt as string,
          })),
      ),
    )
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  const historyByProgramExercise = new Map<string, typeof entries>();
  for (const entry of entries) {
    const history = historyByProgramExercise.get(entry.programExerciseId) ?? [];
    history.push(entry);
    historyByProgramExercise.set(entry.programExerciseId, history);
  }

  return new Map<string, CompletedWeightFallback>(
    [...historyByProgramExercise].map(([programExerciseId, history]) => {
      const latest = history.at(-1)!;
      const previous = history.at(-2);
      return [
        programExerciseId,
        {
          ...latest,
          previousWeightKg: previous?.weightKg ?? null,
        },
      ];
    }),
  );
}

export function normalizeDecimalInput(value: string) {
  return value.trim().replace(",", ".");
}

export function validateBodyMeasurement(values: {
  weight: string;
  bodyFat: string;
  muscle: string;
}) {
  const weightKg = Number(normalizeDecimalInput(values.weight));
  const bodyFatPercentage = Number(normalizeDecimalInput(values.bodyFat));
  const musclePercentage = Number(normalizeDecimalInput(values.muscle));
  const errors: Partial<Record<keyof typeof values, string>> = {};

  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
    errors.weight = "0 ile 500 kg arasında geçerli bir kilo girin.";
  }
  if (
    !Number.isFinite(bodyFatPercentage) ||
    bodyFatPercentage < 0 ||
    bodyFatPercentage > 100
  ) {
    errors.bodyFat = "Yağ oranı 0–100 arasında olmalıdır.";
  }
  if (
    !Number.isFinite(musclePercentage) ||
    musclePercentage < 0 ||
    musclePercentage > 100
  ) {
    errors.muscle = "Kas oranı 0–100 arasında olmalıdır.";
  }

  return Object.keys(errors).length > 0
    ? { success: false as const, errors }
    : {
        success: true as const,
        values: { weightKg, bodyFatPercentage, musclePercentage },
      };
}

export function parsePositiveWeight(value: string) {
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 500
    ? parsed
    : null;
}

import type { TrainingDay } from "@/providers/OnboardingContext";
import type { UserProgram } from "@/features/programs/types";
import i18n from "@/shared/i18n";

export type ProgramCompletionRecord = {
  programExerciseId: string;
  programId: string | null;
  workoutDate: string;
};

export type WeekDayItem = {
  date: Date;
  dateKey: string;
  day: TrainingDay;
  shortLabel: string;
  dayNumber: number;
};

function getDayMeta(): { day: TrainingDay; shortLabel: string }[] {
  return [
    { day: "monday", shortLabel: i18n.t("days.mon") },
    { day: "tuesday", shortLabel: i18n.t("days.tue") },
    { day: "wednesday", shortLabel: i18n.t("days.wed") },
    { day: "thursday", shortLabel: i18n.t("days.thu") },
    { day: "friday", shortLabel: i18n.t("days.fri") },
    { day: "saturday", shortLabel: i18n.t("days.sat") },
    { day: "sunday", shortLabel: i18n.t("days.sun") },
  ];
}

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentWeek(referenceDate = new Date()): WeekDayItem[] {
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
  );
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return getDayMeta().map((meta, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      ...meta,
      date,
      dateKey: toLocalDateKey(date),
      dayNumber: date.getDate(),
    };
  });
}

export function programsForDate(
  programs: UserProgram[],
  week: WeekDayItem[],
  dateKey: string,
) {
  const selectedDay = week.find((item) => item.dateKey === dateKey)?.day;
  return selectedDay
    ? programs.filter((program) => program.trainingDays.includes(selectedDay))
    : [];
}

export function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getCompletedExerciseIds(
  records: ProgramCompletionRecord[],
  dateKey: string,
  programId: string,
) {
  return new Set(
    records
      .filter(
        (record) =>
          record.workoutDate === dateKey &&
          (record.programId === null || record.programId === programId),
      )
      .map((record) => record.programExerciseId),
  );
}

export function getProgramCompletion(
  program: UserProgram,
  records: ProgramCompletionRecord[],
  dateKey: string,
) {
  if (program.exercises.length === 0) return 0;
  const completed = getCompletedExerciseIds(records, dateKey, program.id);
  const completedCount = program.exercises.filter((exercise) =>
    completed.has(exercise.id),
  ).length;
  return clampPercentage((completedCount / program.exercises.length) * 100);
}

export function getWeeklyCompletionValues(
  week: WeekDayItem[],
  records: ProgramCompletionRecord[],
) {
  return week.map((day) => ({
    dateKey: day.dateKey,
    shortLabel: day.shortLabel,
    value: records.filter((record) => record.workoutDate === day.dateKey).length,
  }));
}

export function resolveActiveProgramId(
  programs: UserProgram[],
  currentProgramId: string | null,
) {
  if (currentProgramId && programs.some((program) => program.id === currentProgramId)) {
    return currentProgramId;
  }
  return programs[0]?.id ?? null;
}


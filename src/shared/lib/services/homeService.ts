import { programRepository } from "@/features/programs/program-repository";
import { workoutRepository } from "@/features/workouts/workout-repository";
import { bodyPartIcon } from "@/shared/constants/exercise-taxonomy";
import type {
  CompletedExerciseRecord,
  ExerciseNameLookup,
} from "@/shared/lib/home-dashboard";
import {
  getBodyParts,
  type BodyPartOption,
} from "@/shared/lib/services/exerciseCatalogService";
import { supabase } from "@/shared/lib/supabase";
import type { UserProgram } from "@/features/programs/types";

export type HomeSourceData = {
  programs: UserProgram[];
  completedRecords: CompletedExerciseRecord[];
  exerciseLookup: ExerciseNameLookup;
  categories: BodyPartOption[];
};

/**
 * Ana sayfa dashboard'unun (HomeScreen) ihtiyaç duyduğu her şeyi tek seferde
 * toplar: kullanıcının programları (user_workout_programs +
 * user_workout_program_exercises), bu programlardaki egzersizlerin isim/ikon/
 * vücut-bölgesi bilgisi ve bu haftaki tamamlanma kayıtları
 * (user_completed_exercises).
 *
 * Tamamlanma kayıtları mevcut Supabase kaynağıyla cihazdaki aktif antrenman
 * repository'sinden birleştirilir. Backend akışı hazır olduğunda ekranın veri
 * sözleşmesi değişmeden yerel kaynak kaldırılabilir.
 */
export async function getHomeSourceData(): Promise<HomeSourceData> {
  const programs = await programRepository.listPrograms();
  const exerciseIds = [
    ...new Set(programs.flatMap((program) => program.exercises.map((e) => e.exerciseId))),
  ];

  const [exerciseLookup, categories, completedRecords] = await Promise.all([
    buildExerciseLookup(exerciseIds),
    getBodyParts(),
    getCompletedExercisesThisWeek(),
  ]);

  return { programs, completedRecords, exerciseLookup, categories };
}

async function buildExerciseLookup(
  exerciseIds: string[],
): Promise<ExerciseNameLookup> {
  const lookup: ExerciseNameLookup = new Map();

  if (exerciseIds.length === 0) {
    return lookup;
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, body_part_id, body_parts(name)")
    .in("id", exerciseIds);

  if (error || !data) {
    return lookup;
  }

  for (const row of data as unknown as {
    id: string;
    name: string;
    body_part_id: string | null;
    body_parts: { name: string } | null;
  }[]) {
    lookup.set(row.id, {
      name: row.name,
      icon: bodyPartIcon(row.body_parts?.name ?? null),
      bodyPartId: row.body_part_id,
    });
  }

  return lookup;
}

async function getCompletedExercisesThisWeek(): Promise<CompletedExerciseRecord[]> {
  const [remoteResult, localResult] = await Promise.allSettled([
    supabase
      .from("user_completed_exercises")
      .select("exercise_id, program_exercise_id, workout_date"),
    workoutRepository.getLocalCompletedExerciseRecords(),
  ]);

  const records: CompletedExerciseRecord[] = [];
  if (
    remoteResult.status === "fulfilled" &&
    !remoteResult.value.error &&
    remoteResult.value.data
  ) {
    records.push(
      ...(remoteResult.value.data as unknown as {
        exercise_id: string;
        program_exercise_id: string;
        workout_date: string;
      }[]).map((row) => ({
        exerciseId: row.exercise_id,
        programExerciseId: row.program_exercise_id,
        workoutDate: row.workout_date,
      })),
    );
  }
  if (localResult.status === "fulfilled") {
    records.push(...localResult.value);
  }

  const uniqueRecords = new Map<string, CompletedExerciseRecord>();
  for (const record of records) {
    uniqueRecords.set(
      `${record.exerciseId}:${record.programExerciseId}:${record.workoutDate}`,
      record,
    );
  }
  return [...uniqueRecords.values()];
}

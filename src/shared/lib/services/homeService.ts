import { programRepository } from "@/features/programs/program-repository";
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
 * Not: Uygulamada henüz "egzersizi tamamlandı işaretle" akışı yok, bu yüzden
 * user_completed_exercises şu an için her zaman boş dönebilir — dashboard bu
 * durumda dürüstçe "not_started" gösterir (mock veri döneminde olduğu gibi
 * rastgele "tamamlandı" kayıtları uydurulmaz).
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
  const { data, error } = await supabase
    .from("user_completed_exercises")
    .select("exercise_id, program_exercise_id, workout_date");

  if (error || !data) {
    return [];
  }

  return (data as unknown as {
    exercise_id: string;
    program_exercise_id: string;
    workout_date: string;
  }[]).map((row) => ({
    exerciseId: row.exercise_id,
    programExerciseId: row.program_exercise_id,
    workoutDate: row.workout_date,
  }));
}

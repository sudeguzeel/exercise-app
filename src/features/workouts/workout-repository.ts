import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  extendRestSeconds,
  resolveProgramExerciseRestSeconds,
} from "@/features/exercises/program-exercise-rest";
import { programRepository } from "@/features/programs/program-repository";
import type {
  PersistedProgramExercise,
  UserProgram,
} from "@/features/programs/types";
import type {
  CompleteSetInput,
  LocalCompletedExerciseRecord,
  PendingWorkoutTarget,
  WorkoutCompletion,
  WorkoutExerciseSnapshot,
  WorkoutPhase,
  WorkoutRepository,
  WorkoutSession,
  WorkoutSetSnapshot,
} from "@/features/workouts/types";
import {
  areAllSetsCompleted,
  createWorkoutOccurrenceKey,
  findFirstIncompleteSet,
  findPendingWorkoutTarget,
  findSetPosition,
  getElapsedDurationMs,
  getLocalDateKeyFromTimestamp,
  getRestRemainingSeconds,
  getTrainingDayForDateKey,
  getWorkoutProgress,
  isValidLocalDateKey,
  isWorkoutExerciseCompleted,
  resolveRestDurationSeconds,
  toPendingWorkoutTarget,
} from "@/features/workouts/workout-domain";
import {
  calculateStreakDays,
  type CompletedExerciseRecord,
} from "@/shared/lib/home-dashboard";
import { getWorkingWeight } from "@/features/progress/progress-storage";
import { getExerciseDetail } from "@/shared/lib/services/exerciseCatalogService";
import { supabase } from "@/shared/lib/supabase";

const STORAGE_PREFIX = "@exercise-app/workouts/v1";
const startLocks = new Set<string>();
const setCompletionLocks = new Set<string>();
const setRevertLocks = new Set<string>();
const restMutationLocks = new Set<string>();
const workoutCompletionLocks = new Set<string>();

export type WorkoutRepositoryErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "EMPTY_PROGRAM"
  | "OUT_OF_ORDER"
  | "IN_PROGRESS"
  | "STORAGE_FAILED";

export class WorkoutRepositoryError extends Error {
  constructor(
    public readonly code: WorkoutRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WorkoutRepositoryError";
  }
}

export function isValidWorkoutSessionId(value: string | null | undefined) {
  return Boolean(value && /^ws-[a-z0-9-]{12,}$/i.test(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type LegacyWorkoutSession = WorkoutSession &
  Partial<{
    phase: WorkoutPhase;
    pendingTarget: PendingWorkoutTarget | null;
    restStartedAt: string | null;
    restEndsAt: string | null;
    restDurationSeconds: number | null;
    lastCompletedSetId: string | null;
  }>;

function normalizeSession(session: WorkoutSession): WorkoutSession {
  const legacy = session as LegacyWorkoutSession;
  const pendingTarget = legacy.pendingTarget ?? null;
  let phase: WorkoutPhase = legacy.phase ?? "active";

  if (session.status === "completed") phase = "completed";
  else if (session.status === "completing" || areAllSetsCompleted(session)) {
    phase = "saving";
  } else if (phase === "completed" || phase === "saving") {
    phase = "active";
  }

  if (phase === "rest" && !pendingTarget) phase = "active";

  return {
    ...session,
    phase,
    pendingTarget: phase === "rest" ? pendingTarget : null,
    restStartedAt: phase === "rest" ? (legacy.restStartedAt ?? null) : null,
    restEndsAt: phase === "rest" ? (legacy.restEndsAt ?? null) : null,
    restDurationSeconds:
      phase === "rest" && typeof legacy.restDurationSeconds === "number"
        ? resolveRestDurationSeconds(legacy.restDurationSeconds)
        : null,
    lastCompletedSetId: legacy.lastCompletedSetId ?? null,
  };
}

function activateFirstIncompleteTarget(session: WorkoutSession) {
  const firstIncomplete = findFirstIncompleteSet(session);
  session.phase = firstIncomplete ? "active" : "saving";
  session.pendingTarget = null;
  session.restStartedAt = null;
  session.restEndsAt = null;
  session.restDurationSeconds = null;
}

async function requireUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new WorkoutRepositoryError("AUTH_REQUIRED", "Oturum bulunamadı.");
  }
  return user.id;
}

// user_completed_exercises satırlarını (set değil, egzersiz+tarih bazında)
// backend'e yazan yardımcı — tablo set seviyesinde tutmuyor, "bu egzersizin
// tüm setleri şu tarihte tamamlandı" bilgisini tutuyor (dashboard/seri
// hesaplarının zaten okuduğu tablo, bkz. getCurrentStreak). RLS
// (auth.uid() = user_id) sayesinde kullanıcı sadece kendi kaydını
// oluşturabilir. `onConflict` ile idempotent: aynı egzersiz aynı tarihte
// tekrar tamamlanmaya çalışılırsa (retry, çift tıklama) yeni satır açmaz.
async function upsertCompletedExercise(
  userId: string,
  record: { programExerciseId: string; exerciseId: string; workoutDate: string },
) {
  const { error } = await supabase.from("user_completed_exercises").upsert(
    {
      user_id: userId,
      program_exercise_id: record.programExerciseId,
      exercise_id: record.exerciseId,
      workout_date: record.workoutDate,
    },
    { onConflict: "user_id,program_exercise_id,workout_date", ignoreDuplicates: true },
  );

  if (error) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Tamamlanma bilgisi sunucuya kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
    );
  }
}

function sessionsKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}:sessions`;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman bilgileri cihazdan okunamadı.",
    );
  }
}

async function writeList<T>(key: string, value: T[]) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman bilgileri cihazda saklanamadı.",
    );
  }
}

async function readSessions(userId: string) {
  const sessions = await readList<WorkoutSession>(sessionsKey(userId));
  return sessions
    .filter((session) => session.userId === userId)
    .map(normalizeSession);
}

// Tamamlanmış antrenman geçmişi (sessions'ın aksine) Supabase'de tutulur —
// cihaz değişse/uygulama silinse bile GEÇMİŞ, TOPLAM/SERİ istatistikleri ve
// çalışma kilosu geri düşüşü (bkz. progress-domain.getLatestCompletedWeights)
// kaybolmasın diye. Aktif antrenman oturumu (sessions) hâlâ cihaz içi kalır —
// o ekrana özel, geçici durum.
const WORKOUT_COMPLETION_SELECT =
  "id, workout_session_id, user_id, program_id, program_name, workout_date, completed_date, started_at, completed_at, duration_ms, completed_exercise_count, planned_day, user_workout_completion_sets(program_exercise_id, exercise_id, exercise_order_index, exercise_name, muscle_group_name, set_number, actual_reps, weight_kg, completed_at)";

type WorkoutCompletionSetRow = {
  program_exercise_id: string;
  exercise_id: string;
  exercise_order_index: number;
  exercise_name: string;
  muscle_group_name: string | null;
  set_number: number;
  actual_reps: number;
  weight_kg: number | null;
  completed_at: string | null;
};

type WorkoutCompletionRow = {
  id: string;
  workout_session_id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  workout_date: string;
  completed_date: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  completed_exercise_count: number;
  planned_day: boolean;
  user_workout_completion_sets: WorkoutCompletionSetRow[];
};

function mapCompletionRow(row: WorkoutCompletionRow): WorkoutCompletion {
  const exercisesByProgramExerciseId = new Map<
    string,
    Omit<WorkoutExerciseSnapshot, "sets"> & { sets: WorkoutSetSnapshot[] }
  >();

  for (const setRow of row.user_workout_completion_sets) {
    let exercise = exercisesByProgramExerciseId.get(setRow.program_exercise_id);
    if (!exercise) {
      exercise = {
        programExerciseId: setRow.program_exercise_id,
        exerciseId: setRow.exercise_id,
        orderIndex: setRow.exercise_order_index,
        name: setRow.exercise_name,
        muscleGroupName: setRow.muscle_group_name,
        mediaUrl: null,
        mediaType: null,
        targetSets: 0,
        targetReps: setRow.actual_reps,
        restSeconds: 0,
        sets: [],
      };
      exercisesByProgramExerciseId.set(setRow.program_exercise_id, exercise);
    }
    exercise.sets.push({
      id: `${row.workout_session_id}:${setRow.program_exercise_id}:set:${setRow.set_number}`,
      setNumber: setRow.set_number,
      targetReps: setRow.actual_reps,
      actualReps: setRow.actual_reps,
      weightInput: setRow.weight_kg === null ? "" : String(setRow.weight_kg),
      weightKg: setRow.weight_kg,
      completedAt: setRow.completed_at,
    });
  }

  const exercises = [...exercisesByProgramExerciseId.values()]
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map((exercise) => ({
      ...exercise,
      targetSets: exercise.sets.length,
      sets: exercise.sets.sort((left, right) => left.setNumber - right.setNumber),
    }));

  return {
    id: `wc-${row.workout_session_id}`,
    workoutSessionId: row.workout_session_id,
    userId: row.user_id,
    programId: row.program_id,
    programName: row.program_name,
    workoutDate: row.workout_date,
    completedDate: row.completed_date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
    completedExerciseCount: row.completed_exercise_count,
    exercises,
    plannedDay: row.planned_day,
    // Sunucuda saklanmıyor — yalnızca completeWorkout()'un döndürdüğü anlık
    // sonuçta (workout-complete.tsx tebrik ekranı) anlamlı; geçmişten tekrar
    // okunduğunda kullanılmıyor.
    currentStreak: 0,
    status: "completed",
  };
}

async function readCompletions(userId: string): Promise<WorkoutCompletion[]> {
  const { data, error } = await supabase
    .from("user_workout_completions")
    .select(WORKOUT_COMPLETION_SELECT)
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });
  if (error) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman geçmişi alınamadı. Bağlantınızı kontrol edip tekrar deneyin.",
    );
  }
  return (data as unknown as WorkoutCompletionRow[]).map(mapCompletionRow);
}

async function getCompletionBySessionId(
  userId: string,
  workoutSessionId: string,
): Promise<WorkoutCompletion | null> {
  const { data, error } = await supabase
    .from("user_workout_completions")
    .select(WORKOUT_COMPLETION_SELECT)
    .eq("user_id", userId)
    .eq("workout_session_id", workoutSessionId)
    .maybeSingle<WorkoutCompletionRow>();
  if (error || !data) return null;
  return mapCompletionRow(data);
}

async function listCompletionsForProgramDate(
  userId: string,
  programId: string,
  workoutDate: string,
): Promise<WorkoutCompletion[]> {
  const { data, error } = await supabase
    .from("user_workout_completions")
    .select(WORKOUT_COMPLETION_SELECT)
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("workout_date", workoutDate);
  if (error) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman geçmişi alınamadı. Bağlantınızı kontrol edip tekrar deneyin.",
    );
  }
  return (data as unknown as WorkoutCompletionRow[]).map(mapCompletionRow);
}

async function deleteCompletionBySessionId(
  userId: string,
  workoutSessionId: string,
) {
  const { error } = await supabase
    .from("user_workout_completions")
    .delete()
    .eq("user_id", userId)
    .eq("workout_session_id", workoutSessionId);
  if (error) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Önceki antrenman kaydı temizlenemedi.",
    );
  }
}

async function deleteCompletionsForProgramDate(
  userId: string,
  programId: string,
  workoutDate: string,
) {
  const { error } = await supabase
    .from("user_workout_completions")
    .delete()
    .eq("user_id", userId)
    .eq("program_id", programId)
    .eq("workout_date", workoutDate);
  if (error) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman kayıtları sunucudan silinemedi.",
    );
  }
}

// completeWorkout() tarafından bir kere üretilen final WorkoutCompletion'ı
// Supabase'e yazar. Aynı session için daha önce (tutarsız/yarım) bir kayıt
// varsa önce silinir — FK cascade ile setleri de gider — sonra temiz bir
// kayıt eklenir. İki adım da başarısız olursa (özellikle setler) üst kayıt
// da geri alınır ki geçmişte "hareketsiz" bir antrenman kalmasın.
async function persistCompletion(userId: string, completion: WorkoutCompletion) {
  await deleteCompletionBySessionId(userId, completion.workoutSessionId);

  const { data, error } = await supabase
    .from("user_workout_completions")
    .insert({
      user_id: userId,
      workout_session_id: completion.workoutSessionId,
      program_id: completion.programId,
      program_name: completion.programName,
      workout_date: completion.workoutDate,
      completed_date: completion.completedDate,
      started_at: completion.startedAt,
      completed_at: completion.completedAt,
      duration_ms: completion.durationMs,
      completed_exercise_count: completion.completedExerciseCount,
      planned_day: completion.plannedDay,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new WorkoutRepositoryError(
      "STORAGE_FAILED",
      "Antrenman geçmişe kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
    );
  }

  const setRows = completion.exercises.flatMap((exercise) =>
    exercise.sets
      .filter((set) => Boolean(set.completedAt))
      .map((set) => ({
        completion_id: data.id,
        user_id: userId,
        program_exercise_id: exercise.programExerciseId,
        exercise_id: exercise.exerciseId,
        exercise_order_index: exercise.orderIndex,
        exercise_name: exercise.name,
        muscle_group_name: exercise.muscleGroupName,
        set_number: set.setNumber,
        actual_reps: set.actualReps,
        weight_kg: set.weightKg,
        completed_at: set.completedAt,
      })),
  );

  if (setRows.length > 0) {
    const { error: setsError } = await supabase
      .from("user_workout_completion_sets")
      .insert(setRows);
    if (setsError) {
      await supabase.from("user_workout_completions").delete().eq("id", data.id);
      throw new WorkoutRepositoryError(
        "STORAGE_FAILED",
        "Antrenman setleri kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
      );
    }
  }
}

async function saveSession(userId: string, session: WorkoutSession) {
  if (session.userId !== userId) {
    throw new WorkoutRepositoryError(
      "NOT_FOUND",
      "Antrenman oturumu bu kullanıcıya ait değil.",
    );
  }
  const sessions = await readSessions(userId);
  const index = sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) sessions[index] = clone(session);
  else sessions.push(clone(session));
  await writeList(sessionsKey(userId), sessions);
  return clone(session);
}

async function getSessionForUser(userId: string, workoutSessionId: string) {
  if (!isValidWorkoutSessionId(workoutSessionId)) return null;
  const sessions = await readSessions(userId);
  return (
    sessions.find(
      (session) =>
        session.id === workoutSessionId && session.userId === userId,
    ) ?? null
  );
}

async function buildExerciseSnapshot(
  exercise: PersistedProgramExercise,
  workoutSessionId: string,
  userId: string,
): Promise<WorkoutExerciseSnapshot> {
  let muscleGroupName: string | null = null;
  let mediaUrl: string | null = null;
  let recommendedRestSeconds: number | null = null;
  try {
    const detail = await getExerciseDetail(exercise.exerciseId);
    muscleGroupName = detail?.bodyPartName ?? null;
    mediaUrl = detail?.gifUrl ?? null;
    recommendedRestSeconds = detail?.recommendedRestSeconds ?? null;
  } catch {
    // Medya/meta verisi antrenmanın başlamasını engellemez.
  }
  const workingWeight = await getWorkingWeight(exercise.id, userId).catch(
    () => null,
  );

  return {
    programExerciseId: exercise.id,
    exerciseId: exercise.exerciseId,
    orderIndex: exercise.orderIndex,
    name: exercise.name,
    muscleGroupName,
    mediaUrl,
    mediaType: mediaUrl ? "gif" : null,
    targetSets: exercise.sets,
    targetReps: exercise.reps,
    restSeconds: resolveProgramExerciseRestSeconds({
      customRestSeconds:
        exercise.restSecondsOrigin === "fallback"
          ? null
          : exercise.restSeconds,
      recommendedRestSeconds,
    }),
    sets: Array.from({ length: exercise.sets }, (_, index) => ({
      id: `${workoutSessionId}:${exercise.id}:set:${index + 1}`,
      setNumber: index + 1,
      targetReps: exercise.reps,
      actualReps: exercise.reps,
      weightInput: workingWeight ? String(workingWeight.weightKg) : "",
      weightKg: workingWeight?.weightKg ?? null,
      completedAt: null,
    })),
  };
}

function isSessionAlignedWithProgram(
  session: WorkoutSession,
  program: UserProgram,
) {
  if (
    session.programId !== program.id ||
    session.exercises.length !== program.exercises.length
  ) {
    return false;
  }

  const sessionExerciseById = new Map(
    session.exercises.map((exercise) => [exercise.programExerciseId, exercise]),
  );
  return program.exercises.every((exercise) => {
    const sessionExercise = sessionExerciseById.get(exercise.id);
    return (
      sessionExercise?.exerciseId === exercise.exerciseId &&
      sessionExercise.targetSets === exercise.sets &&
      sessionExercise.sets.length === exercise.sets
    );
  });
}

async function reconcileSessionWithProgram(
  session: WorkoutSession,
  program: UserProgram,
  userId: string,
) {
  const existingById = new Map(
    session.exercises.map((exercise) => [exercise.programExerciseId, exercise]),
  );
  const exercises = await Promise.all(
    [...program.exercises]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(async (exercise) => {
        const existing = existingById.get(exercise.id);
        if (!existing) return buildExerciseSnapshot(exercise, session.id, userId);

        const existingSetsByNumber = new Map(
          existing.sets.map((set) => [set.setNumber, set]),
        );
        return {
          ...existing,
          exerciseId: exercise.exerciseId,
          orderIndex: exercise.orderIndex,
          name: exercise.name,
          targetSets: exercise.sets,
          targetReps: exercise.reps,
          restSeconds: exercise.restSeconds,
          sets: Array.from({ length: exercise.sets }, (_, index) => {
            const setNumber = index + 1;
            const storedSet = existingSetsByNumber.get(setNumber);
            return storedSet
              ? {
                  ...storedSet,
                  setNumber,
                  targetReps: exercise.reps,
                }
              : {
                  id: `${session.id}:${exercise.id}:set:${setNumber}`,
                  setNumber,
                  targetReps: exercise.reps,
                  actualReps: exercise.reps,
                  weightInput: "",
                  weightKg: null,
                  completedAt: null,
                };
          }),
        };
      }),
  );

  return {
    ...session,
    programName: program.name,
    programTrainingDays: [...program.trainingDays],
    exercises,
  };
}

function isCompletionConsistentWithSession(
  completion: WorkoutCompletion,
  session: WorkoutSession,
) {
  const sessionProgress = getWorkoutProgress(session.exercises);
  const completionProgress = getWorkoutProgress(completion.exercises);
  return (
    completion.workoutSessionId === session.id &&
    completion.userId === session.userId &&
    completion.programId === session.programId &&
    completion.workoutDate === session.workoutDate &&
    sessionProgress.canFinalize &&
    completionProgress.canFinalize &&
    completion.completedExerciseCount ===
      completionProgress.completedExerciseCount
  );
}

function completionExerciseRecords(
  completions: WorkoutCompletion[],
): CompletedExerciseRecord[] {
  return completions.flatMap((completion) =>
    completion.exercises
      .filter(isWorkoutExerciseCompleted)
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        programExerciseId: exercise.programExerciseId,
        workoutDate: completion.workoutDate,
      })),
  );
}

function selectOccurrenceSessions(sessions: WorkoutSession[]) {
  const grouped = new Map<string, WorkoutSession[]>();
  for (const session of sessions) {
    if (!isValidLocalDateKey(session.workoutDate)) continue;
    const key = createWorkoutOccurrenceKey({
      userId: session.userId,
      programId: session.programId,
      workoutDate: session.workoutDate,
    });
    const group = grouped.get(key) ?? [];
    group.push(session);
    grouped.set(key, group);
  }

  return [...grouped.values()].map((group) => {
    const sorted = group.sort((left, right) =>
      right.startedAt.localeCompare(left.startedAt),
    );
    return (
      sorted.find((session) => session.status !== "completed") ?? sorted[0]
    );
  });
}

async function getCurrentStreak(
  session: WorkoutSession,
  completions: WorkoutCompletion[],
) {
  let programs = await programRepository.listPrograms().catch(() => []);
  if (!programs.some((program) => program.id === session.programId)) {
    programs = [
      ...programs,
      {
        id: session.programId,
        name: session.programName,
        trainingDays: [...session.programTrainingDays],
        muscleGroupIds: [],
        exercises: session.exercises.map((exercise) => ({
          id: exercise.programExerciseId,
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          orderIndex: exercise.orderIndex,
          sets: exercise.targetSets,
          reps: exercise.targetReps,
          restSeconds: exercise.restSeconds,
        })),
      },
    ];
  }

  const localRecords = completionExerciseRecords(completions);
  let remoteRecords: CompletedExerciseRecord[] = [];
  try {
    const { data, error } = await supabase
      .from("user_completed_exercises")
      .select("exercise_id, program_exercise_id, workout_date");
    if (!error && data) {
      remoteRecords = (data as unknown as {
        exercise_id: string;
        program_exercise_id: string;
        workout_date: string;
      }[]).map((row) => ({
        exerciseId: row.exercise_id,
        programExerciseId: row.program_exercise_id,
        workoutDate: row.workout_date,
      }));
    }
  } catch {
    // Çevrimdışıyken cihazdaki tamamlanmalarla güvenli biçimde devam edilir.
  }
  const uniqueRecords = new Map<string, CompletedExerciseRecord>();
  for (const record of [...remoteRecords, ...localRecords]) {
    uniqueRecords.set(
      `${record.exerciseId}:${record.programExerciseId}:${record.workoutDate}`,
      record,
    );
  }
  return calculateStreakDays(
    programs,
    [...uniqueRecords.values()],
    session.workoutDate,
  );
}

class AsyncStorageWorkoutRepository implements WorkoutRepository {
  async startOrResumeSession(programId: string, workoutDate: string) {
    if (!programId.trim() || !isValidLocalDateKey(workoutDate)) {
      throw new WorkoutRepositoryError(
        "INVALID_INPUT",
        "Program veya antrenman tarihi geçersiz.",
      );
    }

    const userId = await requireUserId();
    const occurrenceKey = createWorkoutOccurrenceKey({
      userId,
      programId,
      workoutDate,
    });
    const lockKey = occurrenceKey;
    if (startLocks.has(lockKey)) {
      throw new WorkoutRepositoryError(
        "IN_PROGRESS",
        "Antrenman hazırlanıyor. Lütfen bekleyin.",
      );
    }
    startLocks.add(lockKey);

    try {
      const program = await programRepository.getProgramById(programId);
      if (!program) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Program bulunamadı.");
      }
      if (program.exercises.length === 0) {
        throw new WorkoutRepositoryError(
          "EMPTY_PROGRAM",
          "Bu programda antrenman başlatılabilecek egzersiz yok.",
        );
      }
      if (
        program.exercises.some(
          (exercise) =>
            !Number.isInteger(exercise.sets) ||
            exercise.sets < 1 ||
            !Number.isInteger(exercise.reps) ||
            exercise.reps < 1,
        )
      ) {
        throw new WorkoutRepositoryError(
          "EMPTY_PROGRAM",
          "Programdaki egzersizlerin set veya tekrar bilgisi eksik.",
        );
      }

      const sessions = await readSessions(userId);
      const candidates = sessions
        .filter(
          (session) =>
            isValidLocalDateKey(session.workoutDate) &&
            createWorkoutOccurrenceKey({
              userId: session.userId,
              programId: session.programId,
              workoutDate: session.workoutDate,
            }) === occurrenceKey,
        )
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      const resumable = candidates.find((session) => session.status !== "completed");
      const completed = candidates.find((session) => session.status === "completed");
      const existing = resumable ?? completed;

      if (existing) {
        const reconciled = await reconcileSessionWithProgram(
          existing,
          program,
          userId,
        );
        const storedCompletion = await getCompletionBySessionId(
          userId,
          reconciled.id,
        );

        if (
          storedCompletion &&
          isCompletionConsistentWithSession(storedCompletion, reconciled)
        ) {
          reconciled.status = "completed";
          reconciled.phase = "completed";
          reconciled.pendingTarget = null;
          reconciled.restStartedAt = null;
          reconciled.restEndsAt = null;
          reconciled.restDurationSeconds = null;
          reconciled.lastResumedAt = null;
          reconciled.completedAt = storedCompletion.completedAt;
          return saveSession(userId, reconciled);
        }

        if (storedCompletion) {
          await deleteCompletionBySessionId(userId, reconciled.id);
        }

        const progress = getWorkoutProgress(reconciled.exercises);
        reconciled.completedAt = null;
        reconciled.pendingTarget = null;
        reconciled.restStartedAt = null;
        reconciled.restEndsAt = null;
        reconciled.restDurationSeconds = null;
        if (progress.canFinalize) {
          reconciled.status = "completing";
          reconciled.phase = "saving";
          reconciled.lastResumedAt = null;
        } else {
          reconciled.status = "active";
          reconciled.phase = "active";
          reconciled.lastResumedAt = new Date().toISOString();
        }
        return saveSession(userId, reconciled);
      }

      const [allSessions, programDateCompletions] = await Promise.all([
        readSessions(userId),
        listCompletionsForProgramDate(userId, programId, workoutDate),
      ]);

      const programCandidates = allSessions
        .filter(
          (session) =>
            session.programId === programId &&
            session.workoutDate === workoutDate,
        )
        .sort((left, right) =>
          right.startedAt.localeCompare(left.startedAt),
        );

      const programResumable = programCandidates.find(
        (session) => session.status !== "completed",
      );

      const programCompleted = programCandidates.find(
        (session) => session.status === "completed",
      );

      const completedProgramExerciseIds = new Set(
        programDateCompletions.flatMap((completion) =>
          completion.exercises
            .filter((exercise) =>
              exercise.sets.every((set) => Boolean(set.completedAt)),
            )
            .map((exercise) => exercise.programExerciseId),
        ),
      );

      const pendingExercises = program.exercises.filter(
        (exercise) => !completedProgramExerciseIds.has(exercise.id),
      );

      if (pendingExercises.length === 0 && programCompleted) {
        return clone(programCompleted);
      }

      if (programResumable) {
        const existingSnapshots = new Map(
          programResumable.exercises.map((exercise) => [
            exercise.programExerciseId,
            exercise,
          ]),
        );

        programResumable.exercises = await Promise.all(
          pendingExercises.map(
            async (exercise) =>
              existingSnapshots.get(exercise.id) ??
              buildExerciseSnapshot(exercise, programResumable.id, userId),
          ),
        );

        programResumable.programName = program.name;
        programResumable.programTrainingDays = [...program.trainingDays];

        if (programResumable.status === "paused") {
          programResumable.status = "active";
          programResumable.lastResumedAt = new Date().toISOString();
        }

        return saveSession(userId, programResumable);
      }
      const now = new Date().toISOString();
      const workoutSessionId = `ws-${Date.now().toString(36)}-${program.id}-${workoutDate}`;
      const exercises = await Promise.all(
        [...pendingExercises]
          .sort((left, right) => left.orderIndex - right.orderIndex)
          .map((exercise) =>
            buildExerciseSnapshot(exercise, workoutSessionId, userId),
          ),
      );
      const session: WorkoutSession = {
        id: workoutSessionId,
        userId,
        programId: program.id,
        programName: program.name,
        programTrainingDays: [...program.trainingDays],
        workoutDate,
        exercises,
        status: "active",
        phase: "active",
        pendingTarget: null,
        restStartedAt: null,
        restEndsAt: null,
        restDurationSeconds: null,
        lastCompletedSetId: null,
        startedAt: now,
        lastResumedAt: now,
        accumulatedDurationMs: 0,
        completedAt: null,
      };
      return saveSession(userId, session);
    } finally {
      startLocks.delete(lockKey);
    }
  }

  async getSession(workoutSessionId: string) {
    const userId = await requireUserId();
    const session = await getSessionForUser(userId, workoutSessionId);
    return session ? clone(session) : null;
  }

  async resumeSession(workoutSessionId: string) {
    const userId = await requireUserId();
    const session = await getSessionForUser(userId, workoutSessionId);
    if (!session) {
      throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
    }
    const wasResting = session.phase === "rest";
    if (wasResting) activateFirstIncompleteTarget(session);
    if (session.status === "paused") {
      session.status = "active";
      session.lastResumedAt = new Date().toISOString();
      return saveSession(userId, session);
    }
    if (wasResting) return saveSession(userId, session);
    return clone(session);
  }

  async pauseSession(workoutSessionId: string) {
    const userId = await requireUserId();
    const session = await getSessionForUser(userId, workoutSessionId);
    if (!session) {
      throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
    }
    if (session.status === "active" && session.lastResumedAt) {
      session.accumulatedDurationMs = getElapsedDurationMs(session);
      session.lastResumedAt = null;
      session.status = "paused";
      if (session.phase === "rest") activateFirstIncompleteTarget(session);
      return saveSession(userId, session);
    }
    return clone(session);
  }

  async revertLastCompletedSet(workoutSessionId: string) {
    if (setRevertLocks.has(workoutSessionId)) {
      throw new WorkoutRepositoryError("IN_PROGRESS", "Önceki sete dönülüyor.");
    }
    setRevertLocks.add(workoutSessionId);
    try {
      const userId = await requireUserId();
      const session = await getSessionForUser(userId, workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      if (session.status !== "active") {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Önceki sete yalnızca aktif antrenmanda dönülebilir.",
        );
      }

      const completedSets = session.exercises.flatMap((exercise) =>
        exercise.sets
          .filter((set) => Boolean(set.completedAt))
          .map((set) => ({ exercise, set })),
      );
      const previous = completedSets.at(-1);
      if (!previous) return clone(session);

      const exerciseWasCompleted = isWorkoutExerciseCompleted(previous.exercise);
      if (exerciseWasCompleted) {
        const { error } = await supabase
          .from("user_completed_exercises")
          .delete()
          .eq("user_id", userId)
          .eq("program_exercise_id", previous.exercise.programExerciseId)
          .eq("workout_date", session.workoutDate);
        if (error) {
          throw new WorkoutRepositoryError(
            "STORAGE_FAILED",
            "Önceki sete dönme bilgisi kaydedilemedi.",
          );
        }
      }

      previous.set.completedAt = null;
      previous.set.actualReps = previous.set.targetReps;
      session.phase = "active";
      session.pendingTarget = null;
      session.restStartedAt = null;
      session.restEndsAt = null;
      session.restDurationSeconds = null;
      session.lastCompletedSetId = completedSets.at(-2)?.set.id ?? null;
      return saveSession(userId, session);
    } finally {
      setRevertLocks.delete(workoutSessionId);
    }
  }

  async completeSet(input: CompleteSetInput) {
    if (
      !Number.isInteger(input.actualReps) ||
      input.actualReps < 1 ||
      input.actualReps > 100 ||
      (input.weightKg !== null &&
        (!Number.isFinite(input.weightKg) ||
          input.weightKg < 0 ||
          input.weightKg > 500))
    ) {
      throw new WorkoutRepositoryError(
        "INVALID_INPUT",
        "Set tekrar veya kilo bilgisi geçersiz.",
      );
    }
    const lockKey = `${input.workoutSessionId}:${input.setId}`;
    if (setCompletionLocks.has(lockKey)) {
      throw new WorkoutRepositoryError("IN_PROGRESS", "Set kaydediliyor.");
    }
    setCompletionLocks.add(lockKey);
    try {
      const userId = await requireUserId();
      const session = await getSessionForUser(userId, input.workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      const position = findSetPosition(session, input.setId);
      if (!position) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Set bulunamadı.");
      }
      if (position.set.completedAt) return clone(session);
      if (session.status !== "active" || session.phase !== "active") {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Devam etmeden önce mevcut antrenman adımını tamamlayın.",
        );
      }
      const activePosition = findFirstIncompleteSet(session);
      if (activePosition?.set.id !== input.setId) {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Önce aktif seti tamamlamalısınız.",
        );
      }
      const completedAt = new Date().toISOString();
      position.set.actualReps = input.actualReps;
      position.set.weightKg = input.weightKg;
      position.set.weightInput =
        input.weightKg === null ? "" : String(input.weightKg);
      position.set.completedAt = completedAt;
      session.lastCompletedSetId = position.set.id;

      const next = findFirstIncompleteSet(session);
      if (next) {
        const restDurationSeconds = resolveRestDurationSeconds(
          position.exercise.restSeconds,
        );
        session.phase = "rest";
        session.pendingTarget = toPendingWorkoutTarget(next);
        session.restStartedAt = completedAt;
        session.restDurationSeconds = restDurationSeconds;
        session.restEndsAt = new Date(
          new Date(completedAt).getTime() + restDurationSeconds * 1000,
        ).toISOString();
      } else {
        session.phase = "saving";
        session.pendingTarget = null;
        session.restStartedAt = null;
        session.restEndsAt = null;
        session.restDurationSeconds = null;
      }

      if (isWorkoutExerciseCompleted(position.exercise)) {
        // Egzersizin son seti tamamlandı — bu, backend'e (Supabase)
        // yazılması gereken an. Yazma başarısız olursa burada throw
        // edip fonksiyondan çıkıyoruz; `saveSession` hiç çağrılmadığı
        // için set yerel olarak da "tamamlandı" kaydedilmiyor — ekran
        // gerçek durumu yanlış yansıtmıyor, kullanıcı tekrar deneyebilir.
        await upsertCompletedExercise(userId, {
          programExerciseId: position.exercise.programExerciseId,
          exerciseId: position.exercise.exerciseId,
          workoutDate: session.workoutDate,
        });
      }

      return saveSession(userId, session);
    } finally {
      setCompletionLocks.delete(lockKey);
    }
  }

  async extendRest(workoutSessionId: string, seconds = 15) {
    if (restMutationLocks.has(workoutSessionId)) {
      throw new WorkoutRepositoryError("IN_PROGRESS", "Dinlenme süresi güncelleniyor.");
    }
    restMutationLocks.add(workoutSessionId);
    try {
      const userId = await requireUserId();
      const session = await getSessionForUser(userId, workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      if (
        session.status !== "active" ||
        session.phase !== "rest" ||
        !findPendingWorkoutTarget(session)
      ) {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Dinlenme süresi artık aktif değil.",
        );
      }

      const now = Date.now();
      const nextRemaining = extendRestSeconds(
        getRestRemainingSeconds(session.restEndsAt, now),
        seconds,
      );
      session.restEndsAt = new Date(now + nextRemaining * 1000).toISOString();
      session.restDurationSeconds = Math.max(
        session.restDurationSeconds ?? 0,
        nextRemaining,
      );
      return saveSession(userId, session);
    } finally {
      restMutationLocks.delete(workoutSessionId);
    }
  }

  async finishRest(workoutSessionId: string) {
    if (restMutationLocks.has(workoutSessionId)) {
      throw new WorkoutRepositoryError("IN_PROGRESS", "Sonraki set hazırlanıyor.");
    }
    restMutationLocks.add(workoutSessionId);
    try {
      const userId = await requireUserId();
      const session = await getSessionForUser(userId, workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      if (session.phase !== "rest") return clone(session);
      if (session.status !== "active") {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Antrenman devam etmeden önce yeniden başlatılmalı.",
        );
      }

      const pending = findPendingWorkoutTarget(session);
      const firstIncomplete = findFirstIncompleteSet(session);
      if (!pending || pending.set.id !== firstIncomplete?.set.id) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Sıradaki antrenman adımı bulunamadı.",
        );
      }

      session.phase = "active";
      session.pendingTarget = null;
      session.restStartedAt = null;
      session.restEndsAt = null;
      session.restDurationSeconds = null;
      return saveSession(userId, session);
    } finally {
      restMutationLocks.delete(workoutSessionId);
    }
  }

  async completeWorkout(workoutSessionId: string) {
    if (workoutCompletionLocks.has(workoutSessionId)) {
      throw new WorkoutRepositoryError(
        "IN_PROGRESS",
        "Antrenman kaydediliyor. Lütfen bekleyin.",
      );
    }
    workoutCompletionLocks.add(workoutSessionId);
    try {
      const userId = await requireUserId();
      const existing = await getCompletionBySessionId(userId, workoutSessionId);
      const session = await getSessionForUser(userId, workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      if (!isValidLocalDateKey(session.workoutDate)) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Antrenmanın planlanan tarihi geçersiz.",
        );
      }
      const program = await programRepository.getProgramById(session.programId);
      if (!program || !isSessionAlignedWithProgram(session, program)) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Program bilgileri değişti. Antrenmanı yeniden açıp devam edin.",
        );
      }
      const progress = getWorkoutProgress(session.exercises);
      if (!progress.canFinalize) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Antrenmanı tamamlamak için bütün setleri bitirmelisiniz.",
        );
      }

      if (existing && isCompletionConsistentWithSession(existing, session)) {
        session.status = "completed";
        session.phase = "completed";
        session.pendingTarget = null;
        session.restStartedAt = null;
        session.restEndsAt = null;
        session.restDurationSeconds = null;
        session.completedAt = existing.completedAt;
        session.accumulatedDurationMs = existing.durationMs;
        session.lastResumedAt = null;
        await saveSession(userId, session);
        return clone(existing);
      }

      const completedAt = new Date().toISOString();
      const completedDate = getLocalDateKeyFromTimestamp(completedAt);
      if (!completedDate) {
        throw new WorkoutRepositoryError(
          "STORAGE_FAILED",
          "Antrenman tamamlanma tarihi oluşturulamadı.",
        );
      }
      const durationMs = getElapsedDurationMs(session, new Date(completedAt).getTime());
      session.status = "completing";
      session.phase = "saving";
      session.accumulatedDurationMs = durationMs;
      session.lastResumedAt = null;
      await saveSession(userId, session);

      const trainingDay = getTrainingDayForDateKey(session.workoutDate);
      const plannedDay = Boolean(
        trainingDay && session.programTrainingDays.includes(trainingDay),
      );
      const baseCompletion: WorkoutCompletion = {
        id: `wc-${session.id}`,
        workoutSessionId: session.id,
        userId,
        programId: session.programId,
        programName: session.programName,
        workoutDate: session.workoutDate,
        completedDate,
        startedAt: session.startedAt,
        completedAt,
        durationMs,
        completedExerciseCount: progress.completedExerciseCount,
        exercises: clone(session.exercises),
        plannedDay,
        currentStreak: 0,
        status: "completed",
      };
      const allCompletions = await readCompletions(userId);
      const validCompletions = existing
        ? allCompletions.filter(
            (completion) => completion.workoutSessionId !== workoutSessionId,
          )
        : allCompletions;
      const completion: WorkoutCompletion = {
        ...baseCompletion,
        currentStreak: await getCurrentStreak(session, [
          ...validCompletions,
          baseCompletion,
        ]),
      };
      await persistCompletion(userId, completion);

      session.status = "completed";
      session.phase = "completed";
      session.pendingTarget = null;
      session.restStartedAt = null;
      session.restEndsAt = null;
      session.restDurationSeconds = null;
      session.completedAt = completedAt;
      await saveSession(userId, session);
      return clone(completion);
    } finally {
      workoutCompletionLocks.delete(workoutSessionId);
    }
  }

  async getCompletion(workoutSessionId: string) {
    if (!isValidWorkoutSessionId(workoutSessionId)) return null;
    const userId = await requireUserId();
    const [completion, session] = await Promise.all([
      getCompletionBySessionId(userId, workoutSessionId),
      getSessionForUser(userId, workoutSessionId),
    ]);
    if (
      !session ||
      !isValidLocalDateKey(session.workoutDate) ||
      session.status !== "completed" ||
      session.phase !== "completed"
    ) {
      return null;
    }
    if (!completion || !isCompletionConsistentWithSession(completion, session)) {
      return null;
    }
    return clone(completion);
  }

  async listCompletions() {
    const userId = await requireUserId();
    const [completions, sessions] = await Promise.all([
      readCompletions(userId),
      readSessions(userId),
    ]);
    const completedSessionsById = new Map(
      sessions
        .filter(
          (session) =>
            session.userId === userId &&
            session.status === "completed" &&
            session.phase === "completed",
        )
        .map((session) => [session.id, session]),
    );
    const unique = new Map<string, WorkoutCompletion>();
    for (const completion of completions) {
      const session = completedSessionsById.get(completion.workoutSessionId);
      if (
        completion.userId !== userId ||
        !session ||
        !isCompletionConsistentWithSession(completion, session)
      ) {
        continue;
      }
      unique.set(completion.id, completion);
    }
    return [...unique.values()]
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
      .map(clone);
  }

  async getCompletionForProgramDate(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const completions = await listCompletionsForProgramDate(
      userId,
      programId,
      workoutDate,
    );
    return completions[0] ? clone(completions[0]) : null;
  }

  async resetCompletedSession(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const matchingCompletions = await listCompletionsForProgramDate(
      userId,
      programId,
      workoutDate,
    );
    const programExerciseIds = [
      ...new Set(
        matchingCompletions.flatMap((completion) =>
          completion.exercises.map((exercise) => exercise.programExerciseId),
        ),
      ),
    ];

    // Egzersiz check-mark'ları ve seri hesabı `user_completed_exercises`
    // (Supabase) tablosundan besleniyor — sadece local kaydı silmek
    // sıfırlamayı görünmez kılar (liste hâlâ tamamlanmış görünür). Bu
    // yüzden önce sunucudaki satırlar siliniyor; başarısız olursa local
    // durum bozulmadan hata fırlatılıyor.
    if (programExerciseIds.length > 0) {
      const { error } = await supabase
        .from("user_completed_exercises")
        .delete()
        .eq("user_id", userId)
        .eq("workout_date", workoutDate)
        .in("program_exercise_id", programExerciseIds);
      if (error) {
        throw new WorkoutRepositoryError(
          "STORAGE_FAILED",
          "Tamamlanma bilgisi sunucudan silinemedi. Bağlantınızı kontrol edip tekrar deneyin.",
        );
      }
    }

    const sessions = await readSessions(userId);
    await writeList(
      sessionsKey(userId),
      sessions.filter(
        (session) =>
          !(
            session.programId === programId &&
            session.workoutDate === workoutDate &&
            session.status === "completed"
          ),
      ),
    );

    await deleteCompletionsForProgramDate(userId, programId, workoutDate);
  }

  async getLocalCompletedExerciseRecords(fromDate?: string, toDate?: string) {
    const userId = await requireUserId();
    const [completions, sessions] = await Promise.all([
      readCompletions(userId),
      readSessions(userId),
    ]);
    const records: LocalCompletedExerciseRecord[] = [];
    const occurrenceSessions = selectOccurrenceSessions(sessions);
    const occurrenceSessionByKey = new Map(
      occurrenceSessions.map((session) => [
        createWorkoutOccurrenceKey({
          userId: session.userId,
          programId: session.programId,
          workoutDate: session.workoutDate,
        }),
        session,
      ]),
    );

    for (const completion of completions) {
      if (
        (fromDate && completion.workoutDate < fromDate) ||
        (toDate && completion.workoutDate > toDate)
      ) {
        continue;
      }
      const occurrenceSession = occurrenceSessionByKey.get(
        createWorkoutOccurrenceKey({
          userId: completion.userId,
          programId: completion.programId,
          workoutDate: completion.workoutDate,
        }),
      );
      if (
        !occurrenceSession ||
        occurrenceSession.id !== completion.workoutSessionId ||
        !isCompletionConsistentWithSession(completion, occurrenceSession)
      ) {
        continue;
      }
      for (const exercise of completion.exercises) {
        if (!isWorkoutExerciseCompleted(exercise)) continue;
        records.push({
          exerciseId: exercise.exerciseId,
          programExerciseId: exercise.programExerciseId,
          programId: completion.programId,
          workoutDate: completion.workoutDate,
        });
      }
    }

    for (const session of occurrenceSessions) {
      if (
        (fromDate && session.workoutDate < fromDate) ||
        (toDate && session.workoutDate > toDate)
      ) {
        continue;
      }
      for (const exercise of session.exercises) {
        if (!isWorkoutExerciseCompleted(exercise)) continue;
        records.push({
          exerciseId: exercise.exerciseId,
          programExerciseId: exercise.programExerciseId,
          programId: session.programId,
          workoutDate: session.workoutDate,
        });
      }
    }

    const uniqueRecords = new Map<string, LocalCompletedExerciseRecord>();
    for (const record of records) {
      uniqueRecords.set(
        `${record.programId}:${record.programExerciseId}:${record.workoutDate}`,
        record,
      );
    }
    return [...uniqueRecords.values()];
  }
}

export const workoutRepository: WorkoutRepository =
  new AsyncStorageWorkoutRepository();

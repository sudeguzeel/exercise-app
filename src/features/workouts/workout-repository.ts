import AsyncStorage from "@react-native-async-storage/async-storage";

import { programRepository } from "@/features/programs/program-repository";
import type { PersistedProgramExercise } from "@/features/programs/types";
import {
  areAllSetsCompleted,
  clampReps,
  findFirstIncompleteSet,
  findSetPosition,
  getElapsedDurationMs,
  getTrainingDayForDateKey,
  isValidLocalDateKey,
} from "@/features/workouts/workout-domain";
import type {
  CompleteSetInput,
  LocalCompletedExerciseRecord,
  WorkoutCompletion,
  WorkoutExerciseSnapshot,
  WorkoutRepository,
  WorkoutSession,
} from "@/features/workouts/types";
import {
  calculateStreakDays,
  type CompletedExerciseRecord,
} from "@/shared/lib/home-dashboard";
import { getExerciseDetail } from "@/shared/lib/services/exerciseCatalogService";
import { supabase } from "@/shared/lib/supabase";

const STORAGE_PREFIX = "@exercise-app/workouts/v1";
const startLocks = new Set<string>();
const setCompletionLocks = new Set<string>();
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

function completionsKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}:completions`;
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
  return readList<WorkoutSession>(sessionsKey(userId));
}

async function saveSession(userId: string, session: WorkoutSession) {
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
  return sessions.find((session) => session.id === workoutSessionId) ?? null;
}

async function buildExerciseSnapshot(
  exercise: PersistedProgramExercise,
): Promise<WorkoutExerciseSnapshot> {
  let muscleGroupName: string | null = null;
  let mediaUrl: string | null = null;
  try {
    const detail = await getExerciseDetail(exercise.exerciseId);
    muscleGroupName = detail?.bodyPartName ?? null;
    mediaUrl = detail?.gifUrl ?? null;
  } catch {
    // Medya/meta verisi antrenmanın başlamasını engellemez.
  }

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
    restSeconds: exercise.restSeconds,
    sets: Array.from({ length: exercise.sets }, (_, index) => ({
      id: `${exercise.id}:set:${index + 1}`,
      setNumber: index + 1,
      targetReps: exercise.reps,
      actualReps: exercise.reps,
      weightInput: "",
      weightKg: null,
      completedAt: null,
    })),
  };
}

function completionExerciseRecords(
  completions: WorkoutCompletion[],
): CompletedExerciseRecord[] {
  return completions.flatMap((completion) =>
    completion.exercises
      .filter((exercise) =>
        exercise.sets.every((set) => Boolean(set.completedAt)),
      )
      .map((exercise) => ({
        exerciseId: exercise.exerciseId,
        programExerciseId: exercise.programExerciseId,
        workoutDate: completion.workoutDate,
      })),
  );
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
    const lockKey = `${userId}:${programId}:${workoutDate}`;
    if (startLocks.has(lockKey)) {
      throw new WorkoutRepositoryError(
        "IN_PROGRESS",
        "Antrenman hazırlanıyor. Lütfen bekleyin.",
      );
    }
    startLocks.add(lockKey);

    try {
      const sessions = await readSessions(userId);
      const candidates = sessions
        .filter(
          (session) =>
            session.programId === programId && session.workoutDate === workoutDate,
        )
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
      const resumable = candidates.find((session) => session.status !== "completed");
      const completed = candidates.find((session) => session.status === "completed");
      const existing = resumable ?? completed;

      if (existing) {
        if (existing.status === "paused") {
          existing.status = "active";
          existing.lastResumedAt = new Date().toISOString();
          return saveSession(userId, existing);
        }
        return clone(existing);
      }

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

      const now = new Date().toISOString();
      const exercises = await Promise.all(
        [...program.exercises]
          .sort((left, right) => left.orderIndex - right.orderIndex)
          .map(buildExerciseSnapshot),
      );
      const session: WorkoutSession = {
        id: `ws-${Date.now().toString(36)}-${program.id}`,
        userId,
        programId: program.id,
        programName: program.name,
        programTrainingDays: [...program.trainingDays],
        workoutDate,
        exercises,
        status: "active",
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
    if (session.status === "paused") {
      session.status = "active";
      session.lastResumedAt = new Date().toISOString();
      return saveSession(userId, session);
    }
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
      return saveSession(userId, session);
    }
    return clone(session);
  }

  async updateSetDraft(
    workoutSessionId: string,
    setId: string,
    draft: { actualReps: number; weightInput: string },
  ) {
    const userId = await requireUserId();
    const session = await getSessionForUser(userId, workoutSessionId);
    if (!session) {
      throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
    }
    const position = findSetPosition(session, setId);
    if (!position || position.set.completedAt) return clone(session);
    const activePosition = findFirstIncompleteSet(session);
    if (activePosition?.set.id !== setId) {
      throw new WorkoutRepositoryError(
        "OUT_OF_ORDER",
        "Önce aktif seti tamamlamalısınız.",
      );
    }
    position.set.actualReps = clampReps(draft.actualReps);
    position.set.weightInput = draft.weightInput;
    return saveSession(userId, session);
  }

  async completeSet(input: CompleteSetInput) {
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
      const activePosition = findFirstIncompleteSet(session);
      if (activePosition?.set.id !== input.setId) {
        throw new WorkoutRepositoryError(
          "OUT_OF_ORDER",
          "Önce aktif seti tamamlamalısınız.",
        );
      }
      if (
        !Number.isInteger(input.actualReps) ||
        input.actualReps < 1 ||
        input.actualReps > 100 ||
        !Number.isFinite(input.weightKg) ||
        input.weightKg < 0
      ) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Tekrar veya ağırlık değeri geçersiz.",
        );
      }
      position.set.actualReps = input.actualReps;
      position.set.weightKg = input.weightKg;
      position.set.weightInput = String(input.weightKg).replace(".", ",");
      position.set.completedAt = new Date().toISOString();

      const exerciseNowCompleted = position.exercise.sets.every((set) =>
        Boolean(set.completedAt),
      );
      if (exerciseNowCompleted) {
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
      const completions = await readList<WorkoutCompletion>(completionsKey(userId));
      const existing = completions.find(
        (completion) => completion.workoutSessionId === workoutSessionId,
      );
      if (existing) {
        const existingSession = await getSessionForUser(userId, workoutSessionId);
        if (existingSession && existingSession.status !== "completed") {
          existingSession.status = "completed";
          existingSession.completedAt = existing.completedAt;
          existingSession.accumulatedDurationMs = existing.durationMs;
          existingSession.lastResumedAt = null;
          await saveSession(userId, existingSession);
        }
        return clone(existing);
      }

      const session = await getSessionForUser(userId, workoutSessionId);
      if (!session) {
        throw new WorkoutRepositoryError("NOT_FOUND", "Antrenman oturumu bulunamadı.");
      }
      if (!areAllSetsCompleted(session)) {
        throw new WorkoutRepositoryError(
          "INVALID_INPUT",
          "Antrenmanı tamamlamak için bütün setleri bitirmelisiniz.",
        );
      }

      const completedAt = new Date().toISOString();
      const durationMs = getElapsedDurationMs(session, new Date(completedAt).getTime());
      session.status = "completing";
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
        startedAt: session.startedAt,
        completedAt,
        durationMs,
        completedExerciseCount: session.exercises.filter((exercise) =>
          exercise.sets.every((set) => Boolean(set.completedAt)),
        ).length,
        exercises: clone(session.exercises),
        plannedDay,
        currentStreak: 0,
        status: "completed",
      };
      const completion: WorkoutCompletion = {
        ...baseCompletion,
        currentStreak: await getCurrentStreak(session, [
          ...completions,
          baseCompletion,
        ]),
      };
      await writeList(completionsKey(userId), [...completions, completion]);

      session.status = "completed";
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
    const completions = await readList<WorkoutCompletion>(completionsKey(userId));
    const completion = completions.find(
      (item) => item.workoutSessionId === workoutSessionId,
    );
    return completion ? clone(completion) : null;
  }

  async getCompletionForProgramDate(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const completions = await readList<WorkoutCompletion>(completionsKey(userId));
    const completion = completions.find(
      (item) => item.programId === programId && item.workoutDate === workoutDate,
    );
    return completion ? clone(completion) : null;
  }

  async resetCompletedSession(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const completions = await readList<WorkoutCompletion>(completionsKey(userId));
    const matchingCompletions = completions.filter(
      (completion) =>
        completion.programId === programId && completion.workoutDate === workoutDate,
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

    await writeList(
      completionsKey(userId),
      completions.filter(
        (completion) =>
          !(completion.programId === programId && completion.workoutDate === workoutDate),
      ),
    );
  }

  async getLocalCompletedExerciseRecords(fromDate?: string, toDate?: string) {
    const userId = await requireUserId();
    const completions = await readList<WorkoutCompletion>(completionsKey(userId));
    return completions
      .filter(
        (completion) =>
          (!fromDate || completion.workoutDate >= fromDate) &&
          (!toDate || completion.workoutDate <= toDate),
      )
      .flatMap<LocalCompletedExerciseRecord>((completion) =>
        completion.exercises
          .filter((exercise) =>
            exercise.sets.every((set) => Boolean(set.completedAt)),
          )
          .map((exercise) => ({
            exerciseId: exercise.exerciseId,
            programExerciseId: exercise.programExerciseId,
            workoutDate: completion.workoutDate,
          })),
      );
  }
}

export const workoutRepository: WorkoutRepository =
  new AsyncStorageWorkoutRepository();

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

type LegacyWorkoutCompletion = Omit<WorkoutCompletion, "completedDate"> &
  Partial<Pick<WorkoutCompletion, "completedDate">>;

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

function normalizeCompletion(
  completion: LegacyWorkoutCompletion,
): WorkoutCompletion {
  const storedCompletedDate = completion.completedDate;
  const completedDate = isValidLocalDateKey(storedCompletedDate)
    ? storedCompletedDate!
    : (getLocalDateKeyFromTimestamp(completion.completedAt) ??
      completion.workoutDate);

  return { ...completion, completedDate };
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
  const sessions = await readList<WorkoutSession>(sessionsKey(userId));
  return sessions
    .filter((session) => session.userId === userId)
    .map(normalizeSession);
}

async function readCompletions(userId: string) {
  const completions = await readList<LegacyWorkoutCompletion>(
    completionsKey(userId),
  );
  return completions
    .filter((completion) => completion.userId === userId)
    .map(normalizeCompletion);
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
      weightInput: "",
      weightKg: null,
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
) {
  const existingById = new Map(
    session.exercises.map((exercise) => [exercise.programExerciseId, exercise]),
  );
  const exercises = await Promise.all(
    [...program.exercises]
      .sort((left, right) => left.orderIndex - right.orderIndex)
      .map(async (exercise) => {
        const existing = existingById.get(exercise.id);
        if (!existing) return buildExerciseSnapshot(exercise, session.id);

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

async function removeCompletionForSession(
  userId: string,
  workoutSessionId: string,
) {
  const completions = await readCompletions(userId);
  const nextCompletions = completions.filter(
    (completion) => completion.workoutSessionId !== workoutSessionId,
  );
  if (nextCompletions.length !== completions.length) {
    await writeList(completionsKey(userId), nextCompletions);
  }
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
        const reconciled = await reconcileSessionWithProgram(existing, program);
        const storedCompletions = await readCompletions(userId);
        const storedCompletion = storedCompletions.find(
          (completion) => completion.workoutSessionId === reconciled.id,
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
          await removeCompletionForSession(userId, reconciled.id);
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

            const [allSessions, completions] = await Promise.all([
        readSessions(userId),
        readList<WorkoutCompletion>(completionsKey(userId)),
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
        completions
          .filter(
            (completion) =>
              completion.programId === programId &&
              completion.workoutDate === workoutDate,
          )
          .flatMap((completion) =>
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
             buildExerciseSnapshot(exercise, programResumable.id)
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
            buildExerciseSnapshot(exercise, workoutSessionId),
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
      previous.set.weightKg = null;
      previous.set.weightInput = "";
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
      position.set.actualReps = position.set.targetReps;
      position.set.weightKg = null;
      position.set.weightInput = "";
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
      const completions = await readCompletions(userId);
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

      const existing = completions.find(
        (completion) => completion.workoutSessionId === workoutSessionId,
      );
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
      const validCompletions = existing
        ? completions.filter(
            (completion) => completion.workoutSessionId !== workoutSessionId,
          )
        : completions;

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
      const completion: WorkoutCompletion = {
        ...baseCompletion,
        currentStreak: await getCurrentStreak(session, [
          ...validCompletions,
          baseCompletion,
        ]),
      };
      await writeList(completionsKey(userId), [
        ...validCompletions,
        completion,
      ]);

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
    const [completions, session] = await Promise.all([
      readCompletions(userId),
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
    const completion = completions.find(
      (item) =>
        item.workoutSessionId === workoutSessionId && item.userId === userId,
    );
    if (!completion || !isCompletionConsistentWithSession(completion, session)) {
      return null;
    }
    const program = await programRepository.getProgramById(session.programId);
    if (!program || !isSessionAlignedWithProgram(session, program)) return null;
    return clone(completion);
  }

  async getCompletionForProgramDate(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const completions = await readCompletions(userId);
    const completion = completions.find(
      (item) => item.programId === programId && item.workoutDate === workoutDate,
    );
    return completion ? clone(completion) : null;
  }

  async resetCompletedSession(programId: string, workoutDate: string) {
    const userId = await requireUserId();
    const completions = await readCompletions(userId);
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

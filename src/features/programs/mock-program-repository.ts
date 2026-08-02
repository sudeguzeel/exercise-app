// @ts-nocheck
// KULLANILMIYOR: program-repository.ts (gerçek Supabase implementasyonu)
// bunun yerine geçti; program-selection.tsx ve new-program.tsx artık oradan
// import ediyor. Bu dosya workspace izin kısıtı nedeniyle silinemedi — güvenle
// elle silinebilir. Aşağıdaki mock veriler (ProgramExercise.reps: string,
// valueSource alanı) artık gerçek types.ts/DB şemasıyla uyuşmuyor, bu yüzden
// tip denetimi kapatıldı.
import {
  normalizeProgramName,
} from "@/features/programs/program-domain";
import type {
  AddExerciseResultItem,
  AddExerciseToProgramsResult,
  CreateProgramWithExerciseInput,
  ProgramExercise,
  ProgramRepository,
  UserProgram,
} from "@/features/programs/types";

export type ProgramRepositoryErrorCode =
  | "DUPLICATE_NAME"
  | "INVALID_INPUT"
  | "REQUEST_FAILED";

export class ProgramRepositoryError extends Error {
  constructor(
    public readonly code: ProgramRepositoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProgramRepositoryError";
  }
}

export type MockProgramRepositoryOptions = {
  delayMs?: number;
  failList?: boolean;
  failCreate?: boolean;
  failedProgramIds?: string[];
};

const INITIAL_PROGRAMS: UserProgram[] = [
  {
    id: "mock-upper-body",
    name: "Üst Vücut",
    trainingDays: ["monday", "thursday"],
    muscleGroupIds: ["chest", "back", "shoulders", "arms"],
    exercises: [
      {
        exerciseId: "lat-pulldown",
        sets: 4,
        reps: "8–12",
        restSeconds: 90,
        valueSource: "recommended",
      },
      {
        exerciseId: "biceps-curl",
        sets: 3,
        reps: "10–12",
        restSeconds: 60,
        valueSource: "recommended",
      },
    ],
  },
  {
    id: "mock-full-body",
    name: "Tüm Vücut",
    trainingDays: ["wednesday", "saturday"],
    muscleGroupIds: ["chest", "back", "legs"],
    exercises: [
      {
        exerciseId: "dumbbell-press",
        sets: 4,
        reps: "10–12",
        restSeconds: 90,
        valueSource: "recommended",
      },
      {
        exerciseId: "goblet-squat",
        sets: 4,
        reps: "10–12",
        restSeconds: 90,
        valueSource: "recommended",
      },
    ],
  },
  {
    id: "mock-lower-body",
    name: "Alt Vücut",
    trainingDays: ["tuesday", "friday"],
    muscleGroupIds: ["legs", "hips", "calves"],
    exercises: [
      {
        exerciseId: "sumo-squat",
        sets: 3,
        reps: "10–12",
        restSeconds: 90,
        valueSource: "recommended",
      },
    ],
  },
];

export class MockProgramRepository implements ProgramRepository {
  private programs: UserProgram[];
  private nextProgramId = 1;
  private readonly delayMs: number;
  private readonly failList: boolean;
  private readonly failCreate: boolean;
  private readonly failedProgramIds: Set<string>;

  constructor(
    seedPrograms: UserProgram[] = INITIAL_PROGRAMS,
    options: MockProgramRepositoryOptions = {},
  ) {
    this.programs = clonePrograms(seedPrograms);
    this.delayMs = options.delayMs ?? 450;
    this.failList = options.failList ?? false;
    this.failCreate = options.failCreate ?? false;
    this.failedProgramIds = new Set(options.failedProgramIds);
  }

  async listPrograms(): Promise<UserProgram[]> {
    await this.wait();
    if (this.failList) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        "Programlar alınamadı.",
      );
    }
    return clonePrograms(this.programs);
  }

  async addExerciseToPrograms(
    programIds: string[],
    exercise: ProgramExercise,
  ): Promise<AddExerciseToProgramsResult> {
    await this.wait();
    if (!isProgramExerciseValid(exercise)) {
      throw new ProgramRepositoryError(
        "INVALID_INPUT",
        "Egzersiz değerleri geçersiz.",
      );
    }

    const requestedIds = [...new Set(programIds)];
    const results: AddExerciseResultItem[] = [];
    const requestedIdSet = new Set(requestedIds);

    const nextPrograms = this.programs.map((program) => {
      if (!requestedIdSet.has(program.id)) return program;

      if (this.failedProgramIds.has(program.id)) {
        results.push(toResult(program, "failed"));
        return program;
      }

      const alreadyExists = program.exercises.some(
        (item) => item.exerciseId === exercise.exerciseId,
      );
      if (alreadyExists) {
        results.push(toResult(program, "alreadyExists"));
        return program;
      }

      results.push(toResult(program, "added"));
      return {
        ...program,
        exercises: [...program.exercises, { ...exercise }],
      };
    });

    for (const programId of requestedIds) {
      if (!this.programs.some((program) => program.id === programId)) {
        results.push({
          programId,
          programName: "Bulunamayan program",
          status: "failed",
        });
      }
    }

    this.programs = nextPrograms;
    return { results: sortResultsByRequestOrder(results, requestedIds) };
  }

  async createProgramWithExercise(
    input: CreateProgramWithExerciseInput,
  ): Promise<UserProgram> {
    await this.wait();
    const trimmedName = input.name.trim();

    if (
      trimmedName.length === 0 ||
      input.trainingDays.length === 0 ||
      input.muscleGroupIds.length === 0 ||
      !isProgramExerciseValid(input.exercise)
    ) {
      throw new ProgramRepositoryError(
        "INVALID_INPUT",
        "Program bilgileri eksik.",
      );
    }

    const normalizedName = normalizeProgramName(trimmedName);
    if (
      this.programs.some(
        (program) => normalizeProgramName(program.name) === normalizedName,
      )
    ) {
      throw new ProgramRepositoryError(
        "DUPLICATE_NAME",
        "Bu ad ile zaten bir programınız var.",
      );
    }

    if (this.failCreate) {
      throw new ProgramRepositoryError(
        "REQUEST_FAILED",
        "Program oluşturulamadı.",
      );
    }

    const createdProgram: UserProgram = {
      id: `mock-created-program-${this.nextProgramId}`,
      name: trimmedName,
      trainingDays: [...new Set(input.trainingDays)],
      muscleGroupIds: [...new Set(input.muscleGroupIds)],
      exercises: [{ ...input.exercise }],
    };

    this.nextProgramId += 1;
    this.programs = [...this.programs, createdProgram];
    return cloneProgram(createdProgram);
  }

  private wait() {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, this.delayMs);
    });
  }
}

function toResult(
  program: UserProgram,
  status: AddExerciseResultItem["status"],
): AddExerciseResultItem {
  return {
    programId: program.id,
    programName: program.name,
    status,
  };
}

function sortResultsByRequestOrder(
  results: AddExerciseResultItem[],
  programIds: string[],
) {
  const order = new Map(programIds.map((id, index) => [id, index]));
  return [...results].sort(
    (left, right) =>
      (order.get(left.programId) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.programId) ?? Number.MAX_SAFE_INTEGER),
  );
}

function cloneProgram(program: UserProgram): UserProgram {
  return {
    ...program,
    trainingDays: [...program.trainingDays],
    muscleGroupIds: [...program.muscleGroupIds],
    exercises: program.exercises.map((exercise) => ({ ...exercise })),
  };
}

function clonePrograms(programs: UserProgram[]) {
  return programs.map(cloneProgram);
}

function isProgramExerciseValid(exercise: ProgramExercise) {
  return (
    exercise.exerciseId.trim().length > 0 &&
    Number.isSafeInteger(exercise.sets) &&
    exercise.sets >= 1 &&
    exercise.sets <= 10 &&
    exercise.reps.trim().length > 0 &&
    Number.isSafeInteger(exercise.restSeconds) &&
    exercise.restSeconds >= 0 &&
    exercise.restSeconds <= 600
  );
}

export const programRepository: ProgramRepository =
  new MockProgramRepository();

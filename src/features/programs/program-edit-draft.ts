import type { TrainingDay } from "@/providers/OnboardingContext";
import type {
  PersistedProgramExercise,
  ProgramExercise,
  UserProgram,
} from "@/features/programs/types";

export type ProgramEditDraft = {
  programId: string;
  name: string;
  trainingDays: TrainingDay[];
  muscleGroupIds: string[];
  exercises: PersistedProgramExercise[];
};

const drafts = new Map<string, ProgramEditDraft>();
let draftExerciseCounter = 0;

function cloneDraft(draft: ProgramEditDraft): ProgramEditDraft {
  return {
    ...draft,
    trainingDays: [...draft.trainingDays],
    muscleGroupIds: [...draft.muscleGroupIds],
    exercises: draft.exercises.map((exercise) => ({ ...exercise })),
  };
}

function normalizeExerciseOrder(exercises: PersistedProgramExercise[]) {
  return exercises.map((exercise, orderIndex) => ({
    ...exercise,
    orderIndex,
  }));
}

export function createProgramEditDraft(program: UserProgram): ProgramEditDraft {
  return {
    programId: program.id,
    name: program.name,
    trainingDays: [...program.trainingDays],
    muscleGroupIds: [...program.muscleGroupIds],
    exercises: normalizeExerciseOrder(program.exercises),
  };
}

export function getProgramEditDraft(programId: string) {
  const draft = drafts.get(programId);
  return draft ? cloneDraft(draft) : null;
}

export function saveProgramEditDraft(draft: ProgramEditDraft) {
  const normalized = {
    ...draft,
    exercises: normalizeExerciseOrder(draft.exercises),
  };
  drafts.set(draft.programId, cloneDraft(normalized));
  return cloneDraft(normalized);
}

export function clearProgramEditDraft(programId: string) {
  drafts.delete(programId);
}

export function removeDraftExercise(
  draft: ProgramEditDraft,
  relationId: string,
) {
  return {
    ...draft,
    exercises: normalizeExerciseOrder(
      draft.exercises.filter((exercise) => exercise.id !== relationId),
    ),
  };
}

export function reorderDraftExercise(
  draft: ProgramEditDraft,
  fromIndex: number,
  toIndex: number,
) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= draft.exercises.length ||
    toIndex >= draft.exercises.length
  ) {
    return cloneDraft(draft);
  }

  const exercises = [...draft.exercises];
  const [moved] = exercises.splice(fromIndex, 1);
  exercises.splice(toIndex, 0, moved);
  return { ...draft, exercises: normalizeExerciseOrder(exercises) };
}

export function addExerciseToProgramEditDraft(
  programId: string,
  exercise: ProgramExercise,
  exerciseName: string,
): "added" | "duplicate" | "missing-draft" {
  const draft = drafts.get(programId);
  if (!draft) return "missing-draft";
  if (
    draft.exercises.some(
      (currentExercise) => currentExercise.exerciseId === exercise.exerciseId,
    )
  ) {
    return "duplicate";
  }

  draftExerciseCounter += 1;
  saveProgramEditDraft({
    ...draft,
    exercises: [
      ...draft.exercises,
      {
        ...exercise,
        id: `draft-${programId}-${draftExerciseCounter}`,
        name: exerciseName,
        orderIndex: draft.exercises.length,
      },
    ],
  });
  return "added";
}


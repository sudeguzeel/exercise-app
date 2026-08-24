import type { TrainingDay } from "@/providers/OnboardingContext";
import type {
  AddExerciseToProgramsResult,
  UserProgram,
} from "@/features/programs/types";
import i18n from "@/shared/i18n";

export function getTrainingDayOptions(): {
  id: TrainingDay;
  shortLabel: string;
  label: string;
}[] {
  return [
    { id: "monday", shortLabel: i18n.t("days.mon"), label: i18n.t("days.monFull") },
    { id: "tuesday", shortLabel: i18n.t("days.tue"), label: i18n.t("days.tueFull") },
    { id: "wednesday", shortLabel: i18n.t("days.wed"), label: i18n.t("days.wedFull") },
    { id: "thursday", shortLabel: i18n.t("days.thu"), label: i18n.t("days.thuFull") },
    { id: "friday", shortLabel: i18n.t("days.fri"), label: i18n.t("days.friFull") },
    { id: "saturday", shortLabel: i18n.t("days.sat"), label: i18n.t("days.satFull") },
    { id: "sunday", shortLabel: i18n.t("days.sun"), label: i18n.t("days.sunFull") },
  ];
}

export type ProgramResultGroup = {
  title: string;
  programNames: string[];
};

export type ProgramResultPresentation = {
  title: string;
  message: string;
  groups: ProgramResultGroup[];
};

export function toggleSelection<T>(selection: Set<T>, value: T): Set<T> {
  const nextSelection = new Set(selection);
  if (nextSelection.has(value)) {
    nextSelection.delete(value);
  } else {
    nextSelection.add(value);
  }
  return nextSelection;
}

export function removeMissingProgramSelections(
  selection: Set<string>,
  programs: UserProgram[],
): Set<string> {
  const availableIds = new Set(programs.map((program) => program.id));
  return new Set([...selection].filter((id) => availableIds.has(id)));
}

export function isProgramFormValid(
  name: string,
  trainingDays: Set<TrainingDay>,
  muscleGroupIds: Set<string>,
) {
  return (
    name.trim().length > 0 &&
    trainingDays.size > 0 &&
    muscleGroupIds.size > 0
  );
}

export function normalizeProgramName(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase(i18n.language);
}

export function buildAddResultPresentation(
  result: AddExerciseToProgramsResult,
): ProgramResultPresentation {
  if (result.results.length === 0) {
    return {
      title: i18n.t("programResult.cannotAddTitle"),
      message: i18n.t("programResult.programsGoneMessage"),
      groups: [],
    };
  }

  const added = getNamesForStatus(result, "added");
  const alreadyExists = getNamesForStatus(result, "alreadyExists");
  const failed = getNamesForStatus(result, "failed");
  const groups: ProgramResultGroup[] = [];

  if (added.length > 0) {
    groups.push({ title: i18n.t("programResult.addedTitle"), programNames: added });
  }
  if (alreadyExists.length > 0) {
    groups.push({
      title: i18n.t("programResult.alreadyExistsTitle"),
      programNames: alreadyExists,
    });
  }
  if (failed.length > 0) {
    groups.push({ title: i18n.t("programResult.failedTitle"), programNames: failed });
  }

  if (added.length === result.results.length) {
    return {
      title: i18n.t("programResult.successTitle"),
      message: i18n.t("programResult.successMessage"),
      groups: [],
    };
  }

  if (alreadyExists.length === result.results.length) {
    return {
      title: i18n.t("programResult.alreadyExistsAllTitle"),
      message: i18n.t("programResult.alreadyExistsMessage"),
      groups,
    };
  }

  const hasExistingExercise = alreadyExists.length > 0;
  return {
    title: added.length > 0 ? i18n.t("programResult.updatedTitle") : i18n.t("programResult.cannotAddTitle"),
    message: hasExistingExercise
      ? i18n.t("programResult.alreadyExistsMessage")
      : i18n.t("programResult.partialFailureMessage"),
    groups,
  };
}

function getNamesForStatus(
  result: AddExerciseToProgramsResult,
  status: AddExerciseToProgramsResult["results"][number]["status"],
) {
  return result.results
    .filter((item) => item.status === status)
    .map((item) => item.programName);
}

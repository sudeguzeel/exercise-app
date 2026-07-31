import type { TrainingDay } from "@/providers/OnboardingContext";
import type {
  AddExerciseToProgramsResult,
  UserProgram,
} from "@/src/features/programs/types";

export const TRAINING_DAY_OPTIONS: {
  id: TrainingDay;
  shortLabel: string;
  label: string;
}[] = [
  { id: "monday", shortLabel: "Pzt", label: "Pazartesi" },
  { id: "tuesday", shortLabel: "Sal", label: "Salı" },
  { id: "wednesday", shortLabel: "Çar", label: "Çarşamba" },
  { id: "thursday", shortLabel: "Per", label: "Perşembe" },
  { id: "friday", shortLabel: "Cum", label: "Cuma" },
  { id: "saturday", shortLabel: "Cmt", label: "Cumartesi" },
  { id: "sunday", shortLabel: "Paz", label: "Pazar" },
];

export type ProgramResultGroup = {
  title: "Eklendi" | "Zaten bulunuyor" | "Eklenemedi";
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
  return name.trim().normalize("NFC").toLocaleLowerCase("tr-TR");
}

export function buildAddResultPresentation(
  result: AddExerciseToProgramsResult,
): ProgramResultPresentation {
  if (result.results.length === 0) {
    return {
      title: "Egzersiz eklenemedi",
      message: "Seçilen programlar artık mevcut değil. Lütfen tekrar deneyin.",
      groups: [],
    };
  }

  const added = getNamesForStatus(result, "added");
  const alreadyExists = getNamesForStatus(result, "alreadyExists");
  const failed = getNamesForStatus(result, "failed");
  const groups: ProgramResultGroup[] = [];

  if (added.length > 0) {
    groups.push({ title: "Eklendi", programNames: added });
  }
  if (alreadyExists.length > 0) {
    groups.push({
      title: "Zaten bulunuyor",
      programNames: alreadyExists,
    });
  }
  if (failed.length > 0) {
    groups.push({ title: "Eklenemedi", programNames: failed });
  }

  if (added.length === result.results.length) {
    return {
      title: "İşlem tamamlandı",
      message: "Egzersiz seçtiğiniz programlara başarıyla eklendi.",
      groups: [],
    };
  }

  if (alreadyExists.length === result.results.length) {
    return {
      title: "Egzersiz zaten mevcut",
      message: "Bu egzersiz seçilen programda zaten bulunuyor.",
      groups,
    };
  }

  const hasExistingExercise = alreadyExists.length > 0;
  return {
    title: added.length > 0 ? "Programlar güncellendi" : "Egzersiz eklenemedi",
    message: hasExistingExercise
      ? "Bu egzersiz seçilen programda zaten bulunuyor."
      : "Bazı programlar teknik bir nedenle güncellenemedi.",
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

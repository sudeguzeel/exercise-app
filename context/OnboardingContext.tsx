import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type Gender = "female" | "male" | "other" | "";

export type Goal =
  | "lose-weight"
  | "gain-weight"
  | "build-muscle"
  | "stay-fit"
  | "";

export type FitnessPreference = "cardio" | "strength" | "flexibility";

export type TrainingDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type PersonalInfo = {
  fullName: string;
  gender: Gender;
  birthDate: string;
  height: string;
  currentWeight: string;
  targetWeight: string;
  goal: Goal;
};

type OnboardingContextType = {
  personalInfo: PersonalInfo;
  setPersonalInfo: React.Dispatch<React.SetStateAction<PersonalInfo>>;

  fitnessPreferences: FitnessPreference[];
  setFitnessPreferences: React.Dispatch<
    React.SetStateAction<FitnessPreference[]>
  >;

  trainingDays: TrainingDay[];
  setTrainingDays: React.Dispatch<React.SetStateAction<TrainingDay[]>>;

  resetOnboarding: () => void;
};

const initialPersonalInfo: PersonalInfo = {
  fullName: "",
  gender: "",
  birthDate: "",
  height: "",
  currentWeight: "",
  targetWeight: "",
  goal: "",
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

type OnboardingProviderProps = {
  children: ReactNode;
};

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [personalInfo, setPersonalInfo] =
    useState<PersonalInfo>(initialPersonalInfo);

  const [fitnessPreferences, setFitnessPreferences] = useState<
    FitnessPreference[]
  >([]);

  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);

  const resetOnboarding = () => {
    setPersonalInfo(initialPersonalInfo);
    setFitnessPreferences([]);
    setTrainingDays([]);
  };

  const value = useMemo(
    () => ({
      personalInfo,
      setPersonalInfo,
      fitnessPreferences,
      setFitnessPreferences,
      trainingDays,
      setTrainingDays,
      resetOnboarding,
    }),
    [personalInfo, fitnessPreferences, trainingDays],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used inside an OnboardingProvider");
  }

  return context;
}

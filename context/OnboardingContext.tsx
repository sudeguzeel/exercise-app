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

  const resetOnboarding = () => {
    setPersonalInfo(initialPersonalInfo);
    setFitnessPreferences([]);
  };

  const value = useMemo(
    () => ({
      personalInfo,
      setPersonalInfo,
      fitnessPreferences,
      setFitnessPreferences,
      resetOnboarding,
    }),
    [personalInfo, fitnessPreferences],
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

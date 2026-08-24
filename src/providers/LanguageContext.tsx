import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import i18n, { SUPPORTED_LANGUAGES, type AppLanguage } from "@/shared/i18n";

const LANGUAGE_STORAGE_KEY = "fit-app:language";

type LanguageContextValue = {
  language: AppLanguage;
  isHydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

function isAppLanguage(value: string | null): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function detectDeviceLanguage(): AppLanguage {
  const deviceLanguageCode = Localization.getLocales()[0]?.languageCode;
  return isAppLanguage(deviceLanguageCode) ? deviceLanguageCode : "tr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("tr");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        const nextLanguage = isAppLanguage(storedLanguage)
          ? storedLanguage
          : detectDeviceLanguage();
        if (mounted) setLanguageState(nextLanguage);
        void i18n.changeLanguage(nextLanguage);
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    void i18n.changeLanguage(nextLanguage);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => {
      // Dil bellek içinde uygulanmaya devam eder; sonraki açılışta cihaz
      // diline göre yeniden belirlenir.
    });
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, isHydrated, setLanguage }),
    [isHydrated, language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }
  return context;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AppThemeTokens,
  type AppThemeColors,
  type AppThemeMode,
} from "@/shared/constants/theme";

const THEME_STORAGE_KEY = "fit-app:theme-mode";

type AppThemeContextValue = {
  mode: AppThemeMode;
  colors: AppThemeColors;
  isDark: boolean;
  isHydrated: boolean;
  setMode: (mode: AppThemeMode) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined,
);

function isThemeMode(value: string | null): value is AppThemeMode {
  return value === "light" || value === "dark";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppThemeMode>("light");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedMode) => {
        if (mounted && isThemeMode(storedMode)) setModeState(storedMode);
      })
      .finally(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((nextMode: AppThemeMode) => {
    setModeState(nextMode);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch(() => {
      // Tema bellek içinde uygulanmaya devam eder; sonraki açılışta varsayılan
      // açık temaya güvenli şekilde geri dönülür.
    });
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      colors: AppThemeTokens[mode],
      isDark: mode === "dark",
      isHydrated,
      setMode,
    }),
    [isHydrated, mode, setMode],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside an AppThemeProvider");
  }
  return context;
}

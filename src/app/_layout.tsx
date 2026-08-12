import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as NativeSplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import "react-native-reanimated";

import {
  AppThemeProvider,
  useAppTheme,
} from "@/providers/AppThemeContext";
import { OnboardingProvider } from "@/providers/OnboardingContext";
import { FavoritesProvider } from "@/providers/FavoritesContext";

void NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigator />
    </AppThemeProvider>
  );
}

function RootNavigator() {
  const { colors, isDark, isHydrated } = useAppTheme();
  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.borderSubtle,
        notification: colors.error,
      },
    }),
    [colors, isDark],
  );

  useEffect(() => {
    if (isHydrated) void NativeSplashScreen.hideAsync();
  }, [isHydrated]);

  if (!isHydrated) return null;

  return (
    <OnboardingProvider>
      <FavoritesProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="index"
              options={{
                animation: "none",
              }}
            />

            <Stack.Screen
              name="(auth)"
              options={{
                animation: "fade",
                animationDuration: 650,
              }}
            />

            <Stack.Screen
              name="(main)"
              options={{
                animation: "fade",
                animationDuration: 650,
              }}
            />

            <Stack.Screen
              name="onboarding/personal-info"
              options={{
                animation: "fade",
                animationDuration: 650,
              }}
            />

            <Stack.Screen name="onboarding/fitness-experience" />
            <Stack.Screen name="onboarding/weekly-training-days" />
          </Stack>

          <StatusBar
            backgroundColor={colors.background}
            style={isDark ? "light" : "dark"}
          />
        </ThemeProvider>
      </FavoritesProvider>
    </OnboardingProvider>
  );
}

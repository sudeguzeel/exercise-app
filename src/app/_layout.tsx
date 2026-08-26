import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as NativeSplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import {
  AppThemeProvider,
  useAppTheme,
} from "@/providers/AppThemeContext";
import { LanguageProvider, useLanguage } from "@/providers/LanguageContext";
import { OnboardingProvider } from "@/providers/OnboardingContext";
import { FavoritesProvider } from "@/providers/FavoritesContext";
import { AndroidBackSwipe } from "@/shared/components/android-back-swipe";

void NativeSplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppThemeProvider>
        <AndroidBackSwipe>
          <RootNavigator />
        </AndroidBackSwipe>
      </AppThemeProvider>
    </LanguageProvider>
  );
}

function RootNavigator() {
  const { colors, isDark, isHydrated: isThemeHydrated } = useAppTheme();
  const { isHydrated: isLanguageHydrated } = useLanguage();
  const isHydrated = isThemeHydrated && isLanguageHydrated;
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

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const elements = [
      document.documentElement,
      document.body,
      document.getElementById("root"),
    ].filter((element): element is HTMLElement => element !== null);
    const previousStyles = elements.map((element) => ({
      element,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
      overscrollBehavior: element.style.overscrollBehavior,
    }));

    elements.forEach((element) => {
      element.style.height = "100%";
      element.style.maxHeight = "100%";
      element.style.overflow = "hidden";
      element.style.overscrollBehavior = "none";
    });

    return () => {
      previousStyles.forEach(({ element, ...styles }) => {
        Object.assign(element.style, styles);
      });
    };
  }, []);

  if (!isHydrated) return null;

  return (
    <OnboardingProvider>
      <FavoritesProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: "horizontal",
              contentStyle: {
                backgroundColor: colors.background,
                overflow: "hidden",
              },
            }}
          >
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

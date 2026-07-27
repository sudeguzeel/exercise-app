import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { OnboardingProvider } from "@/context/OnboardingContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <OnboardingProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="email-sent" />
          <Stack.Screen name="onboarding/personal-info" />
          <Stack.Screen name="onboarding/fitness-experience" />
          <Stack.Screen name="onboarding/weekly-training-days" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" />
        </Stack>

        <StatusBar style="auto" />
      </ThemeProvider>
    </OnboardingProvider>
  );
}

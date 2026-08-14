import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/providers/AppThemeContext";
import { FloatingTabBar } from "@/shared/components/floating-tab-bar";

export default function MainLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const tabBarSpacing = 78 + Math.max(insets.bottom, 10);

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          paddingBottom: tabBarSpacing,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana Sayfa",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: "Program",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "document-text" : "document-text-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="exercise"
        options={{
          title: "Egzersiz",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "İlerlemen",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="profile-personal-info" options={{ href: null }} />
      <Tabs.Screen name="profile-notifications" options={{ href: null }} />
      <Tabs.Screen name="profile-language" options={{ href: null }} />
      <Tabs.Screen name="profile-app-settings" options={{ href: null }} />
      <Tabs.Screen name="profile-privacy" options={{ href: null }} />
      <Tabs.Screen name="profile-change-password" options={{ href: null }} />
    </Tabs>
  );
}

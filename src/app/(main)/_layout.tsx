import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#62B900",
        tabBarInactiveTintColor: "#777A78",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarStyle: {
          height: 74,
          marginBottom: 8,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: "#E2E4DF",
          backgroundColor: "#FFFFFF",
        },
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
      <Tabs.Screen name="profile-personal-info" options={{ href: null }} />
      <Tabs.Screen name="profile-notifications" options={{ href: null }} />
      <Tabs.Screen name="profile-language" options={{ href: null }} />
      <Tabs.Screen name="profile-app-settings" options={{ href: null }} />
      <Tabs.Screen name="profile-privacy" options={{ href: null }} />
    </Tabs>
  );
}

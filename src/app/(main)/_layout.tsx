import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Ana Sayfa" }} />
      <Tabs.Screen name="explore" options={{ title: "Keşfet" }} />
    </Tabs>
  );
}
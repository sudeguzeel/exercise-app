import { supabase } from "@/shared/lib/supabase";
import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";

export type WeeklySteps = number[];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function mondayOfWeek(date: Date) {
  const day = startOfDay(date);
  const mondayIndex = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - mondayIndex);
  return day;
}

export async function isPedometerAvailable(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function requestPedometerPermission(): Promise<boolean> {
  try {
    const { status } = await Pedometer.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function syncTodaySteps(): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!(await isPedometerAvailable())) return null;
  if (!(await requestPedometerPermission())) return null;

  const now = new Date();
  const start = startOfDay(now);
  const { steps } = await Pedometer.getStepCountAsync(start, now);

  const { error } = await supabase.from("daily_steps").upsert(
    {
      user_id: user.id,
      day: toDateKey(start),
      step_count: steps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day" },
  );
  if (error) throw error;

  return steps;
}

export async function loadWeeklySteps(): Promise<WeeklySteps> {
  const week = new Array(7).fill(0);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return week;

  const monday = mondayOfWeek(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const { data, error } = await supabase
    .from("daily_steps")
    .select("day, step_count")
    .eq("user_id", user.id)
    .gte("day", toDateKey(monday))
    .lte("day", toDateKey(sunday));

  if (error || !data) return week;

  for (const row of data as { day: string; step_count: number }[]) {
    const rowDate = new Date(`${row.day}T00:00:00`);
    const index = Math.round((rowDate.getTime() - monday.getTime()) / 86_400_000);
    if (index >= 0 && index < 7) week[index] = row.step_count;
  }
  return week;
}

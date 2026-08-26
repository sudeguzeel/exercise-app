import { Image } from "expo-image";
import { useAppTheme } from "@/providers/AppThemeContext";
import { useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

const SLEEPY_FRAMES = [
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-01.png"),
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-02.png"),
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-03.png"),
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-04.png"),
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-05.png"),
  require("../../../assets/images/mascots/raccoon/sleepy/sleepy-06.png"),
] as const;

const TIRED_FRAMES = [
  require("../../../assets/images/mascots/raccoon/tired/tired-01.png"),
] as const;
const TIRED_LIGHT = require("../../../assets/images/mascots/raccoon/tired/tired-01-light.png");
const SLEEPY_LIGHT = require("../../../assets/images/mascots/raccoon/sleepy/sleepy-01-light-v2.png");

const GETTING_USED_FRAMES = [
  require("../../../assets/images/mascots/raccoon/getting-used/getting-used-01.png"),
] as const;
const GETTING_USED_DAY_06 = require("../../../assets/images/mascots/raccoon/getting-used/getting-used-day-06.png");
const GETTING_USED_DAY_07 = require("../../../assets/images/mascots/raccoon/getting-used/getting-used-day-07.png");
const GETTING_USED_LIGHT = require("../../../assets/images/mascots/raccoon/getting-used/getting-used-01-light.png");
const GETTING_USED_DAY_06_LIGHT = require("../../../assets/images/mascots/raccoon/getting-used/getting-used-day-06-light.png");

const BRAVE_FRAMES = [
  require("../../../assets/images/mascots/raccoon/brave/brave-01.png"),
] as const;
const BRAVE_LIGHT = require("../../../assets/images/mascots/raccoon/brave/brave-01-light-v2.png");

const BRAVE_II_FRAMES = [
  require("../../../assets/images/mascots/raccoon/brave-ii/brave-ii-01.png"),
] as const;
const BRAVE_II_LIGHT = require("../../../assets/images/mascots/raccoon/brave-ii/brave-ii-01-light.png");

const FIT_FRAMES = [
  require("../../../assets/images/mascots/raccoon/fit/fit-01.png"),
] as const;
const FIT_LIGHT = require("../../../assets/images/mascots/raccoon/fit/fit-01-light.png");

const ATHLETE_FRAMES = [
  require("../../../assets/images/mascots/raccoon/athlete/athlete-01.png"),
] as const;
const ATHLETE_LIGHT = require("../../../assets/images/mascots/raccoon/athlete/athlete-01-light.png");

const CHAMPION_FRAMES = [
  require("../../../assets/images/mascots/raccoon/champion/champion-01.png"),
] as const;
const CHAMPION_LIGHT = require("../../../assets/images/mascots/raccoon/champion/champion-01-light-v2.png");

const FRAME_SETS = {
  sleepy: SLEEPY_FRAMES,
  tired: TIRED_FRAMES,
  getting_used: GETTING_USED_FRAMES,
  brave: BRAVE_FRAMES,
  brave_ii: BRAVE_II_FRAMES,
  fit: FIT_FRAMES,
  athlete: ATHLETE_FRAMES,
  champion: CHAMPION_FRAMES,
} as const;

const FRAME_DURATIONS = {
  sleepy: 700,
  tired: 800,
  getting_used: 1000,
  brave: 1000,
  brave_ii: 1000,
  fit: 1000,
  athlete: 1000,
  champion: 1000,
} as const;

export type RaccoonMood =
  | "sleepy"
  | "tired"
  | "getting_used"
  | "motivated"
  | "focused"
  | "fit"
  | "athlete"
  | "champion";

type ActiveAnimationState = keyof typeof FRAME_SETS;

type RaccoonMascotProps = {
  size?: number;
  streak: number;
  style?: StyleProp<ViewStyle>;
};

export function getRaccoonMood(streak: number): RaccoonMood {
  const safeStreak = Number.isFinite(streak)
    ? Math.max(0, Math.floor(streak))
    : 0;

  if (safeStreak <= 2) return "sleepy";
  if (safeStreak <= 4) return "tired";
  if (safeStreak <= 6) return "getting_used";
  if (safeStreak <= 14) return "motivated";
  if (safeStreak <= 29) return "focused";
  if (safeStreak <= 59) return "fit";
  if (safeStreak <= 99) return "athlete";
  return "champion";
}

function getActiveAnimationState(mood: RaccoonMood): ActiveAnimationState {
  if (mood === "sleepy") return "sleepy";
  if (mood === "getting_used") return "getting_used";
  if (mood === "motivated") return "brave";
  if (mood === "focused") return "brave_ii";
  if (mood === "fit") return "fit";
  if (mood === "athlete") return "athlete";
  return "champion";
}

export function RaccoonMascot({
  size = 150,
  streak,
  style,
}: RaccoonMascotProps) {
  const { isDark } = useAppTheme();
  const mood = getRaccoonMood(streak);
  const animationState = getActiveAnimationState(mood);
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = FRAME_SETS[animationState];
  const safeStreak = Number.isFinite(streak)
    ? Math.max(0, Math.floor(streak))
    : 0;
  const displayedFrame =
    animationState === "sleepy" && !isDark
      ? SLEEPY_LIGHT
      : animationState === "tired" && !isDark
        ? TIRED_LIGHT
      : animationState === "getting_used" && !isDark && safeStreak >= 6
        ? GETTING_USED_DAY_06_LIGHT
      : animationState === "getting_used" && !isDark
        ? GETTING_USED_LIGHT
      : animationState === "brave" && !isDark
        ? BRAVE_LIGHT
      : animationState === "champion" && !isDark
      ? CHAMPION_LIGHT
      : animationState === "athlete" && !isDark
      ? ATHLETE_LIGHT
      : animationState === "fit" && !isDark
      ? FIT_LIGHT
      : animationState === "brave_ii" && !isDark
      ? BRAVE_II_LIGHT
      : animationState === "getting_used" && safeStreak >= 7
      ? GETTING_USED_DAY_07
      : animationState === "getting_used" && safeStreak >= 6
        ? GETTING_USED_DAY_06
        : frames[frameIndex];

  useEffect(() => {
    setFrameIndex(0);
  }, [animationState]);

  useEffect(() => {
    if (frames.length <= 1) {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, FRAME_DURATIONS[animationState]);

    return () => clearInterval(timer);
  }, [animationState, frames.length]);

  return (
    <View
      accessibilityLabel={
        animationState === "sleepy"
          ? "Yerde kıvrılarak uyuyan rakun maskotu"
          : animationState === "tired"
            ? "Antrenmandan sonra oturarak dinlenen yorgun rakun maskotu"
            : animationState === "brave"
              ? "Dik ve kararlı duran cesur rakun maskotu"
              : animationState === "brave_ii"
                ? "Atletik ve odaklanmış duran cesur rakun maskotu"
                : animationState === "fit"
                  ? "Antrenman öncesi esneyen fit rakun maskotu"
                  : animationState === "athlete"
                    ? "Kendinden emin duran profesyonel atlet rakun maskotu"
                    : animationState === "champion"
                      ? "100 gün rozetli, sakin ve özgüvenli şampiyon rakun maskotu"
                  : "Spora alışmaya başlayan ayakta rakun maskotu"
      }
      accessibilityRole="image"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <Image
        contentFit="contain"
        source={displayedFrame}
        style={StyleSheet.absoluteFill}
        transition={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});

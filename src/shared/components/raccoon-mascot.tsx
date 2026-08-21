import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
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

const TIRED_DAY_FRAME_SETS = {
  1: [
    require("../../../assets/images/mascots/raccoon/tired/tired-01.png"),
    require("../../../assets/images/mascots/raccoon/tired/tired-day-01-mouth-closed.png"),
  ],
  2: [
    require("../../../assets/images/mascots/raccoon/tired/tired-day-02.png"),
    require("../../../assets/images/mascots/raccoon/tired/tired-day-02-mouth-closed.png"),
  ],
  3: [
    require("../../../assets/images/mascots/raccoon/tired/tired-day-03-mouth-open.png"),
    require("../../../assets/images/mascots/raccoon/tired/tired-day-03.png"),
  ],
} as const;

const GETTING_USED_FRAMES = [
  require("../../../assets/images/mascots/raccoon/getting-used/getting-used-01.png"),
] as const;

const FRAME_SETS = {
  sleepy: SLEEPY_FRAMES,
  tired: TIRED_DAY_FRAME_SETS[1],
  getting_used: GETTING_USED_FRAMES,
} as const;

const FRAME_DURATIONS = {
  sleepy: 700,
  tired: 1200,
  getting_used: 1000,
} as const;

export type RaccoonMood =
  | "sleepy"
  | "tired"
  | "getting_used"
  | "motivated"
  | "focused"
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

  if (safeStreak === 0) return "sleepy";
  if (safeStreak <= 3) return "tired";
  if (safeStreak <= 7) return "getting_used";
  if (safeStreak <= 14) return "motivated";
  if (safeStreak <= 29) return "focused";
  return "champion";
}

function getActiveAnimationState(mood: RaccoonMood): ActiveAnimationState {
  if (mood === "sleepy") return "sleepy";
  if (mood === "getting_used") return "getting_used";
  return "tired";
}

function getTiredDay(streak: number): 1 | 2 | 3 {
  const safeStreak = Number.isFinite(streak)
    ? Math.max(1, Math.floor(streak))
    : 1;

  if (safeStreak === 1) return 1;
  if (safeStreak === 2) return 2;
  return 3;
}

function selectAnimationState(
  previousMood: RaccoonMood,
  mood: RaccoonMood,
): ActiveAnimationState {
  // Future extension point: when wake_up frames exist, the sleepy -> tired
  // transition can temporarily return a one-shot transition state here.
  void previousMood;
  return getActiveAnimationState(mood);
}

export function RaccoonMascot({
  size = 150,
  streak,
  style,
}: RaccoonMascotProps) {
  const mood = getRaccoonMood(streak);
  const previousMoodRef = useRef(mood);
  const [animationState, setAnimationState] = useState<ActiveAnimationState>(
    () => getActiveAnimationState(mood),
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const frames =
    animationState === "tired"
      ? TIRED_DAY_FRAME_SETS[getTiredDay(streak)]
      : FRAME_SETS[animationState];

  useEffect(() => {
    setAnimationState(selectAnimationState(previousMoodRef.current, mood));
    setFrameIndex(0);
    previousMoodRef.current = mood;
  }, [mood]);

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
            : "Spora alışmaya başlayan ayakta rakun maskotu"
      }
      accessibilityRole="image"
      style={[styles.container, { width: size, height: size }, style]}
    >
      <Image
        contentFit="contain"
        source={frames[frameIndex]}
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

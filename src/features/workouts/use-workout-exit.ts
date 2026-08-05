import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutSession } from "@/features/workouts/types";
import { router } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Alert, BackHandler } from "react-native";

type MutableSessionRef = { current: WorkoutSession | null };
type MutableBooleanRef = { current: boolean };

export function useWorkoutExit({
  sessionRef,
  workoutSessionId,
  transitionInProgressRef,
}: {
  sessionRef: MutableSessionRef;
  workoutSessionId: string;
  transitionInProgressRef: MutableBooleanRef;
}) {
  const promptOpenRef = useRef(false);
  const leavingRef = useRef(false);

  const leaveWorkout = useCallback(async () => {
    if (leavingRef.current || transitionInProgressRef.current) return;
    leavingRef.current = true;
    transitionInProgressRef.current = true;
    try {
      if (isValidWorkoutSessionId(workoutSessionId)) {
        await workoutRepository.pauseSession(workoutSessionId);
      }
      router.replace("/(main)");
    } catch {
      leavingRef.current = false;
      transitionInProgressRef.current = false;
      Alert.alert(
        "Antrenman kaydedilemedi",
        "İlerlemen güvenli biçimde saklanamadığı için ekrandan çıkılmadı. Lütfen yeniden dene.",
      );
    }
  }, [transitionInProgressRef, workoutSessionId]);

  const requestExit = useCallback(() => {
    if (!sessionRef.current) {
      router.replace("/(main)");
      return;
    }
    if (
      promptOpenRef.current ||
      leavingRef.current ||
      transitionInProgressRef.current
    ) {
      return;
    }

    promptOpenRef.current = true;
    Alert.alert(
      "Antrenmandan çıkmak istiyor musun?",
      "Tamamladığın setler korunacak ancak antrenman tamamlanmış sayılmayacak.",
      [
        {
          text: "Antrenmana devam et",
          style: "cancel",
          onPress: () => {
            promptOpenRef.current = false;
          },
        },
        {
          text: "Antrenmandan çık",
          style: "destructive",
          onPress: () => {
            promptOpenRef.current = false;
            void leaveWorkout();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          promptOpenRef.current = false;
        },
      },
    );
  }, [leaveWorkout, sessionRef, transitionInProgressRef]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestExit();
        return true;
      },
    );
    return () => subscription.remove();
  }, [requestExit]);

  return requestExit;
}

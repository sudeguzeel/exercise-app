import {
  isValidWorkoutSessionId,
  workoutRepository,
} from "@/features/workouts/workout-repository";
import type { WorkoutSession } from "@/features/workouts/types";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [exitDialogVisible, setExitDialogVisible] = useState(false);

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
    setExitDialogVisible(true);
  }, [sessionRef, transitionInProgressRef]);

  const cancelExit = useCallback(() => {
    promptOpenRef.current = false;
    setExitDialogVisible(false);
  }, []);

  const confirmExit = useCallback(() => {
    promptOpenRef.current = false;
    setExitDialogVisible(false);
    void leaveWorkout();
  }, [leaveWorkout]);

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

  return { requestExit, exitDialogVisible, cancelExit, confirmExit };
}

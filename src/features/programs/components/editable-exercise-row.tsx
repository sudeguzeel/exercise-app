import type { PersistedProgramExercise } from "@/features/programs/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ROW_STEP = 72;

export function EditableExerciseRow({
  exercise,
  index,
  total,
  onMove,
  onRemove,
  onDragStateChange,
}: {
  exercise: PersistedProgramExercise;
  index: number;
  total: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (relationId: string) => void;
  onDragStateChange: (dragging: boolean) => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
        onPanResponderGrant: () => onDragStateChange(true),
        onPanResponderMove: (_, gesture) => translateY.setValue(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          const target = Math.max(
            0,
            Math.min(total - 1, index + Math.round(gesture.dy / ROW_STEP)),
          );
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          onDragStateChange(false);
          onMove(index, target);
        },
        onPanResponderTerminate: () => {
          translateY.setValue(0);
          onDragStateChange(false);
        },
      }),
    [index, onDragStateChange, onMove, total, translateY],
  );

  const handleAccessibilityAction = (actionName: string) => {
    if (actionName === "increment" && index < total - 1) {
      onMove(index, index + 1);
    }
    if (actionName === "decrement" && index > 0) {
      onMove(index, index - 1);
    }
  };

  return (
    <Animated.View style={[styles.row, { transform: [{ translateY }] }]}>
      <View
        accessibilityActions={[
          { name: "decrement", label: "Yukarı taşı" },
          { name: "increment", label: "Aşağı taşı" },
        ]}
        accessibilityLabel={`${exercise.name} egzersizini sırala`}
        accessibilityRole="adjustable"
        onAccessibilityAction={(event) =>
          handleAccessibilityAction(event.nativeEvent.actionName)
        }
        style={styles.dragHandle}
        {...responder.panHandlers}
      >
        <Ionicons name="reorder-three-outline" size={24} color={MainColors.mutedText} />
      </View>
      <Text numberOfLines={2} style={styles.name}>
        {exercise.name}
      </Text>
      <Text style={styles.value}>
        {exercise.sets}×{exercise.reps}
      </Text>
      <Pressable
        accessibilityLabel={`${exercise.name} egzersizini programdan kaldır`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onRemove(exercise.id)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Ionicons name="close" size={23} color="#FF4D55" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    zIndex: 2,
  },
  dragHandle: {
    width: 34,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    minWidth: 0,
    color: MainColors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  value: { color: MainColors.mutedText, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});


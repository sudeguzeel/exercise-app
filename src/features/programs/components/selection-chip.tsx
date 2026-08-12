import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

type SelectionChipProps = {
  label: string;
  selected: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
  compact?: boolean;
};

export function SelectionChip({
  label,
  selected,
  accessibilityLabel,
  onPress,
  compact = false,
}: SelectionChipProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      aria-checked={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.compactChip,
        selected && styles.selectedChip,
        pressed && styles.pressedChip,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={[styles.label, selected && styles.selectedLabel]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
  chip: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  compactChip: {
    width: "22.5%",
    minWidth: 66,
    paddingHorizontal: 8,
  },
  selectedChip: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  pressedChip: {
    opacity: 0.74,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "800",
  },
  selectedLabel: {
    color: colors.onPrimary,
  },
  });
}

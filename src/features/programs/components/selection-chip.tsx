import { MainColors } from "@/shared/constants/theme";
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

const styles = StyleSheet.create({
  chip: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 18,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  compactChip: {
    width: "22.5%",
    minWidth: 66,
    paddingHorizontal: 8,
  },
  selectedChip: {
    borderColor: MainColors.primaryBright,
    backgroundColor: MainColors.primaryBright,
  },
  pressedChip: {
    opacity: 0.74,
  },
  label: {
    color: MainColors.mutedText,
    fontSize: 15,
    fontWeight: "800",
  },
  selectedLabel: {
    color: MainColors.text,
  },
});

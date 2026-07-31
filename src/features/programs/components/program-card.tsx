import type { UserProgram } from "@/src/features/programs/types";
import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ProgramCardProps = {
  program: UserProgram;
  categoryLabel: string;
  selected: boolean;
  onPress: (programId: string) => void;
};

export function ProgramCard({
  program,
  categoryLabel,
  selected,
  onPress,
}: ProgramCardProps) {
  return (
    <Pressable
      aria-checked={selected}
      accessibilityLabel={`${program.name}, ${categoryLabel}, ${program.exercises.length} hareket`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => onPress(program.id)}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <Ionicons
          name="clipboard-outline"
          size={26}
          color={selected ? MainColors.primary : MainColors.text}
        />
      </View>

      <View style={styles.content}>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={2}
          style={styles.name}
        >
          {program.name}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={2}
          style={styles.meta}
        >
          {categoryLabel} · {program.exercises.length} hareket
        </Text>
      </View>

      <View style={[styles.selection, selected && styles.selectionSelected]}>
        {selected ? (
          <Ionicons name="checkmark" size={18} color={MainColors.text} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 94,
    padding: 14,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardSelected: {
    borderColor: MainColors.primaryBright,
    backgroundColor: "#EFF9DA",
  },
  cardPressed: {
    opacity: 0.76,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: MainColors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxSelected: {
    backgroundColor: MainColors.surface,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: MainColors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  meta: {
    marginTop: 4,
    color: MainColors.mutedText,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  selection: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 17,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectionSelected: {
    borderColor: MainColors.primaryBright,
    backgroundColor: MainColors.primaryBright,
  },
});

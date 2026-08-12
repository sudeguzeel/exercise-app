import type { UserProgram } from "@/features/programs/types";
import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          color={selected ? colors.primary : colors.text}
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
          <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
  card: {
    minHeight: 94,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primarySoft,
  },
  cardPressed: {
    opacity: 0.76,
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxSelected: {
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },
  meta: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  selection: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 17,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectionSelected: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryBright,
  },
  });
}

import { MainColors } from "@/shared/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type ProgramFlowHeaderProps = {
  title: string;
  onBack: () => void;
};

export function ProgramFlowHeader({
  title,
  onBack,
}: ProgramFlowHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Geri dön"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={23}
          color={MainColors.text}
        />
      </Pressable>

      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: MainColors.border,
    borderRadius: 24,
    backgroundColor: MainColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    color: MainColors.mutedText,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 48,
  },
});


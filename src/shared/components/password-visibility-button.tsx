import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "@/providers/AppThemeContext";

type PasswordVisibilityButtonProps = {
  visible: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function PasswordVisibilityButton({
  visible,
  onPress,
  disabled = false,
}: PasswordVisibilityButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={visible ? "Şifreyi gizle" : "Şifreyi göster"}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Ionicons
        name={visible ? "eye-off-outline" : "eye-outline"}
        size={21}
        color={colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 40,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});

import { useAppTheme } from "@/providers/AppThemeContext";
import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

type TailDirection = "bottom-left" | "bottom-right";

export function MascotSpeechBubble({
  message,
  compact = false,
  tailDirection = "bottom-right",
  style,
  textStyle,
}: {
  message: string;
  compact?: boolean;
  tailDirection?: TailDirection;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View
      accessibilityLabel={message}
      accessibilityRole="text"
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.tail,
          tailDirection === "bottom-left" ? styles.tailLeft : styles.tailRight,
        ]}
      >
        <View style={styles.tailFill} />
      </View>
      <View style={[styles.bubble, compact && styles.compact]}>
        <Text style={[styles.text, compact && styles.compactText, textStyle]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  isDark: boolean,
) {
  return StyleSheet.create({
    container: { alignSelf: "flex-start" },
    bubble: {
      width: "100%",
      maxWidth: 190,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderWidth: 1.25,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDark ? 0.34 : 0.16,
      shadowRadius: 6,
      elevation: 4,
      zIndex: 1,
    },
    compact: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
    text: {
      flexShrink: 1,
      color: colors.text,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },
    compactText: { fontSize: 11, lineHeight: 14 },
    tail: {
      position: "absolute",
      bottom: -9,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderTopWidth: 10,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.border,
    },
    tailLeft: { left: 17, transform: [{ rotate: "12deg" }] },
    tailRight: { right: 17, transform: [{ rotate: "-12deg" }] },
    tailFill: {
      position: "absolute",
      top: -10,
      left: -6,
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 8,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: colors.surfaceElevated,
    },
  });
}

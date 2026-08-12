import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";

const VISIBLE_ROUTES = new Set(["index", "program", "exercise", "progress"]);

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom, isDark);
  const routes = state.routes.filter((route) => VISIBLE_ROUTES.has(route.name));

  const content = (
    <View style={styles.items}>
      {routes.map((route) => {
        const descriptor = descriptors[route.key];
        const options = descriptor.options;
        const isFocused = state.routes[state.index]?.key === route.key;
        const color = isFocused ? colors.primary : colors.textSecondary;
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : typeof options.title === "string"
              ? options.title
              : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <Pressable
            accessibilityLabel={options.tabBarAccessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            key={route.key}
            onLongPress={onLongPress}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tab,
              isFocused && styles.activeTab,
              pressed && styles.pressed,
            ]}
            testID={options.tabBarButtonTestID}
          >
            {options.tabBarIcon?.({ color, focused: isFocused, size: 22 })}
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.shadowShell}>
        {Platform.OS === "android" ? (
          <View style={styles.fallback}>{content}</View>
        ) : (
          <BlurView
            intensity={82}
            style={styles.blur}
            tint={isDark ? "dark" : "light"}
          >
            {content}
          </BlurView>
        )}
      </View>
    </View>
  );
}

function createStyles(
  colors: AppThemeColors,
  bottomInset: number,
  isDark: boolean,
) {
  return StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 78 + bottomInset,
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: Math.max(bottomInset, 10),
      backgroundColor: "transparent",
    },
    shadowShell: {
      flex: 1,
      borderRadius: 32,
      shadowColor: colors.overlay,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 10,
    },
    blur: {
      flex: 1,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: `${colors.borderSubtle}4D`,
      borderRadius: 32,
      backgroundColor: `${colors.tabBar}${isDark ? "73" : "66"}`,
    },
    fallback: {
      flex: 1,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: `${colors.borderSubtle}4D`,
      borderRadius: 32,
      backgroundColor: `${colors.surfaceElevated}${isDark ? "D9" : "CC"}`,
    },
    items: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 5,
    },
    tab: {
      flex: 1,
      height: "100%",
      minWidth: 0,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    activeTab: {
      borderWidth: 1,
      borderColor: `${colors.border}40`,
      backgroundColor: `${colors.primarySoft}59`,
    },
    pressed: {
      opacity: 0.72,
    },
    label: {
      maxWidth: "100%",
      paddingHorizontal: 2,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "800",
      textAlign: "center",
    },
  });
}

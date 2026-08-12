import { useMemo } from "react";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

const normalize = (value: string) => value.replace(/\s/g, "").toLowerCase();

function themedColor(property: string, value: string, colors: AppThemeColors) {
  const color = normalize(value);

  if (["#f6f7f2", "#f8f9f4", "#f8f8f5"].includes(color)) return colors.background;
  if (["#ffffff", "#fff"].includes(color)) {
    return property === "color" ? colors.inverseText : colors.surface;
  }
  if (["#14171a", "#171a18", "#202320", "#101010", "#101214", "#111111"].includes(color)) {
    return property === "backgroundColor" ? colors.inverseSurface : colors.text;
  }
  if (["#6c716c", "#747774", "#777", "#777b76", "#7a7f78", "#858985", "#676b65", "#4e524d", "#4f534e", "#727671"].includes(color)) return colors.textSecondary;
  if (["#9a9e99", "#a5a9a4", "#a9ada8"].includes(color)) return colors.placeholder;
  if (["#dde2d8", "#e1e3df", "#e2e5df", "#d9ddd5", "#d6d9d1"].includes(color)) return colors.borderSubtle;
  if (["#a8d96d", "#cce1ae", "#d7e9b6"].includes(color) || color.startsWith("rgba(116,168,0,")) return colors.border;
  if (["#eaf6d7", "#edf6dc", "#edf8de", "#eef6d9", "#f1f6eb", "#f1f8e5", "#f1f4ec"].includes(color) || color.startsWith("rgba(149,214,0,")) return colors.primarySoft;
  if (["#95d600", "#a4de3d", "#87d900"].includes(color)) return colors.primaryBright;
  if (["#62b900", "#65a900", "#74a800", "#80d000"].includes(color)) return colors.primary;
  if (["#d14343", "#d94a4a", "#d94b4b", "#ff4d55", "#ff5757", "#ff5a5a", "#b73535"].includes(color)) return colors.error;
  if (color.startsWith("rgba(255,90,90,") || color.startsWith("rgba(209,67,67,")) return colors.errorBackground;
  if (color.startsWith("rgba(0,0,0,")) return colors.overlay;
  return value;
}

function transformStyle(value: unknown, colors: AppThemeColors): unknown {
  if (Array.isArray(value)) return value.map((item) => transformStyle(item, colors));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([property, item]) => {
      if (typeof item === "string" && property.toLowerCase().includes("color")) {
        return [property, themedColor(property, item, colors)];
      }
      return [property, transformStyle(item, colors)];
    }),
  );
}

export function useThemedScreenStyles<T extends NamedStyles<T>>(styles: T): T {
  const { colors } = useAppTheme();
  return useMemo(() => transformStyle(styles, colors) as T, [colors, styles]);
}

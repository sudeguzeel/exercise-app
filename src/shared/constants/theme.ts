/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type AppThemeMode = "light" | "dark";

export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textDisabled: string;
  border: string;
  borderSubtle: string;
  inputBackground: string;
  placeholder: string;
  primary: string;
  primaryBright: string;
  primaryStrong: string;
  primarySoft: string;
  onPrimary: string;
  error: string;
  errorBackground: string;
  tabBar: string;
  overlay: string;
  disabled: string;
  inverseSurface: string;
  inverseText: string;
};

export const AppThemeTokens: Record<AppThemeMode, AppThemeColors> = {
  light: {
    background: "#F8F8F5",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    text: "#171A18",
    textSecondary: "#747774",
    textDisabled: "#A9ADA8",
    border: "#CCE1AE",
    borderSubtle: "#E1E3DF",
    inputBackground: "#FFFFFF",
    placeholder: "#7A7F78",
    primary: "#62B900",
    primaryBright: "#87D900",
    primaryStrong: "#65A900",
    primarySoft: "#F1F6EB",
    onPrimary: "#111516",
    error: "#D14343",
    errorBackground: "rgba(209, 67, 67, 0.06)",
    tabBar: "#FFFFFF",
    overlay: "rgba(0, 0, 0, 0.48)",
    disabled: "#D9DED4",
    inverseSurface: "#111516",
    inverseText: "#FFFFFF",
  },
  dark: {
    background: "#111410",
    surface: "#191D18",
    surfaceElevated: "#222720",
    text: "#F2F4EF",
    textSecondary: "#A8AEA5",
    textDisabled: "#747B71",
    border: "#3A4634",
    borderSubtle: "#2B302A",
    inputBackground: "#1F241E",
    placeholder: "#858D82",
    primary: "#87D900",
    primaryBright: "#87D900",
    primaryStrong: "#9AE62A",
    primarySoft: "#26331E",
    onPrimary: "#101510",
    error: "#FF7474",
    errorBackground: "rgba(255, 116, 116, 0.12)",
    tabBar: "#171B16",
    overlay: "rgba(0, 0, 0, 0.68)",
    disabled: "#343A32",
    inverseSurface: "#F2F4EF",
    inverseText: "#171A18",
  },
};

export const Colors = {
  light: {
    text: AppThemeTokens.light.text,
    background: AppThemeTokens.light.background,
    tint: AppThemeTokens.light.primary,
    icon: AppThemeTokens.light.textSecondary,
    tabIconDefault: AppThemeTokens.light.textSecondary,
    tabIconSelected: AppThemeTokens.light.primary,
  },
  dark: {
    text: AppThemeTokens.dark.text,
    background: AppThemeTokens.dark.background,
    tint: AppThemeTokens.dark.primary,
    icon: AppThemeTokens.dark.textSecondary,
    tabIconDefault: AppThemeTokens.dark.textSecondary,
    tabIconSelected: AppThemeTokens.dark.primary,
  },
};

export const AuthColors = {
  background: "#F6F7F2",
  surface: "#FFFFFF",
  text: "#14171A",
  mutedText: "#6C716C",
  placeholder: "#7A7F78",
  primary: "#95D600",
  primaryPressed: "#84C900",
  primaryDark: "#65A900",
  paleGreen: "#EDF6DC",
  border: "rgba(116, 168, 0, 0.38)",
  error: "#D14343",
  errorBackground: "rgba(209, 67, 67, 0.06)",
} as const;

export const AuthLayout = {
  maxContentWidth: 480,
  horizontalPadding: 24,
  controlHeight: 56,
  controlRadius: 18,
} as const;

export const AuthTypography = {
  title: 34,
  titleLineHeight: 40,
  body: 15,
  bodyLineHeight: 23,
  label: 13,
  input: 16,
  button: 16,
  link: 15,
  maxFontSizeMultiplier: 1.3,
} as const;

export const MainColors = {
  background: "#F8F8F5",
  surface: "#FFFFFF",
  text: "#171A18",
  mutedText: "#747774",
  primary: "#62B900",
  primaryBright: "#87D900",
  paleGreen: "#F1F6EB",
  border: "#CCE1AE",
  subtleBorder: "#E1E3DF",
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

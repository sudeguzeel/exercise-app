/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
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

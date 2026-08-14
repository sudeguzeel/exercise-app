import { useState } from "react";
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from "react-native";

type RandomMascotProps = {
  accessibilityLabel: string;
  sources: readonly ImageSourcePropType[];
  style?: StyleProp<ImageStyle>;
  variantStyles?: readonly (StyleProp<ImageStyle> | undefined)[];
};

export function RandomMascot({
  accessibilityLabel,
  sources,
  style,
  variantStyles,
}: RandomMascotProps) {
  const [selectedIndex] = useState(() =>
    Math.floor(Math.random() * sources.length),
  );
  const source = sources[selectedIndex];

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      source={source}
      style={[style, variantStyles?.[selectedIndex]]}
    />
  );
}

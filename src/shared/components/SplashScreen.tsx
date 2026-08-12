import { useAppTheme } from "@/providers/AppThemeContext";
import type { AppThemeColors } from "@/shared/constants/theme";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";

type SplashScreenProps = {
  isLeaving: boolean;
};

export function SplashScreen({ isLeaving }: SplashScreenProps) {
  const { colors, isDark } = useAppTheme();
  const darkStyles = useMemo(() => createDarkStyles(colors), [colors]);
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const textTranslateY = useRef(new Animated.Value(22)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringRotation = useRef(new Animated.Value(0)).current;

  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),

      Animated.timing(ringOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const rotation = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    rotation.start();

    return () => {
      rotation.stop();
    };
  }, [
    logoOpacity,
    logoScale,
    ringOpacity,
    ringRotation,
    textOpacity,
    textTranslateY,
  ]);

  useEffect(() => {
    if (!isLeaving) {
      return;
    }

    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [contentOpacity, isLeaving]);

  const ringRotate = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const logo = (
    <>
      <Animated.Image
        source={require("../../../assets/images/fitrehber_logo_icon.png")}
        style={[styles.logoIcon, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
      <Animated.Image
        source={require("../../../assets/images/fitrehber_logo_text.png")}
        style={[styles.logoText, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}
        resizeMode="contain"
      />
    </>
  );

  if (isDark) {
    return (
      <View style={darkStyles.container}>
        <StatusBar style="light" />
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <View style={darkStyles.brandPanel}>{logo}</View>
          <Animated.View
            style={[
              darkStyles.loadingRing,
              { opacity: ringOpacity, transform: [{ rotate: ringRotate }] },
            ]}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ImageBackground
        source={require("../../../assets/images/fitrehber_splash_background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
            },
          ]}
        >
          {logo}

          <Animated.Image
            source={require("../../../assets/images/fitrehber_loading_ring.png")}
            style={[
              styles.loadingRing,
              {
                opacity: ringOpacity,
                transform: [{ rotate: ringRotate }],
              },
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

function createDarkStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    brandPanel: {
      width: "100%",
      maxWidth: 360,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 32,
      backgroundColor: colors.inverseSurface,
      alignItems: "center",
    },
    loadingRing: {
      width: 48,
      height: 48,
      marginTop: 28,
      borderWidth: 5,
      borderColor: colors.border,
      borderTopColor: colors.primary,
      borderRightColor: colors.primary,
      borderRadius: 24,
    },
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F2",
  },

  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logoIcon: {
    width: 185,
    height: 185,
  },

  logoText: {
    width: 280,
    height: 110,
    marginTop: -8,
  },

  loadingRing: {
    width: 54,
    height: 54,
    marginTop: 28,
  },
});

import { Image, StyleSheet, View } from "react-native";

import { AuthColors } from "@/shared/constants/theme";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/fitrehber_splash_light.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 260,
    height: 260,
  },
});
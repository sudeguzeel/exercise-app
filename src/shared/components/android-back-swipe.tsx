import { usePathname, useRouter } from "expo-router";
import { type PropsWithChildren, useMemo } from "react";
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
} from "react-native";

const EDGE_WIDTH = 28;
const BACK_DISTANCE = 72;
const BACK_VELOCITY = 0.45;
const PREVIOUS_TAB: Record<string, "/" | "/program" | "/exercise"> = {
  "/program": "/",
  "/exercise": "/program",
  "/progress": "/exercise",
};
const NEXT_TAB: Record<string, "/program" | "/exercise" | "/progress"> = {
  "/": "/program",
  "/program": "/exercise",
  "/exercise": "/progress",
};

export function AndroidBackSwipe({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const previousTab = PREVIOUS_TAB[pathname];
  const nextTab = NEXT_TAB[pathname];
  const isMainTab = pathname === "/" || Boolean(previousTab) || Boolean(nextTab);
  const canSwipeBack = Boolean(previousTab) || (Platform.OS === "android" && pathname !== "/");
  const canHandleSwipe = canSwipeBack || Boolean(nextTab);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4;
          const isBackGesture =
            canSwipeBack &&
            (isMainTab || gesture.x0 <= EDGE_WIDTH) &&
            gesture.dx > 10;
          const isForwardGesture =
            Boolean(nextTab) && gesture.dx < -10;

          return isHorizontal && (isBackGesture || isForwardGesture);
        },
        onPanResponderRelease: (_, gesture) => {
          const isBackSwipe = canSwipeBack && (
            gesture.dx >= BACK_DISTANCE ||
            (gesture.dx > 30 && gesture.vx >= BACK_VELOCITY)
          );
          const isForwardSwipe = Boolean(nextTab) && (
            gesture.dx <= -BACK_DISTANCE ||
            (gesture.dx < -30 && gesture.vx <= -BACK_VELOCITY)
          );

          if (isBackSwipe && previousTab) {
            router.replace(previousTab);
          } else if (isBackSwipe && router.canGoBack()) {
            router.back();
          } else if (isForwardSwipe && nextTab) {
            router.replace(nextTab);
          }
        },
      }),
    [canSwipeBack, isMainTab, nextTab, previousTab, router],
  );

  return (
    <View
      style={styles.container}
      {...(canHandleSwipe ? panResponder.panHandlers : {})}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

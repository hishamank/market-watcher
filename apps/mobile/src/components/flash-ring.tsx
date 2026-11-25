import { duration, radius } from "@mini/tokens";
import { StyleSheet } from "react-native";
import Animated, { css, cubicBezier } from "react-native-reanimated";

const fadeOut = css.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

export function FlashRing({ color }: { color: string }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, motion.fade, { borderColor: color }]}
    />
  );
}

const motion = css.create({
  fade: {
    animationName: fadeOut,
    animationDuration: `${duration.flash}ms`,
    animationTimingFunction: cubicBezier(0.2, 0, 0, 1),
    animationFillMode: "both",
  },
});

const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1.5,
    borderRadius: radius.pill,
  },
});

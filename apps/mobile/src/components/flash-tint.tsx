import type { FlashDirection } from "@mini/core";
import { duration, easing, radius } from "@mini/tokens";
import { StyleSheet } from "react-native";
import Animated, { css, cubicBezier } from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { usePalette } from "../theme/palette.ts";

const fadeOut = css.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0 },
});

export function FlashTint({ direction }: { direction: FlashDirection }) {
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  if (reduceMotion) return null;
  const color = direction === "up" ? palette.gainTint : palette.lossTint;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.tint, motion.fade, { backgroundColor: color }]}
    />
  );
}

const motion = css.create({
  fade: {
    animationName: fadeOut,
    animationDuration: `${duration.flash}ms`,
    animationTimingFunction: cubicBezier(...easing.standard),
    animationFillMode: "both",
  },
});

const styles = StyleSheet.create({
  tint: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: -4,
    end: -4,
    borderRadius: radius.xs,
  },
});

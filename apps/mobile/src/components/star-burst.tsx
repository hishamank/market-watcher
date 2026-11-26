import { duration, easing } from "@mini/tokens";
import { StyleSheet, View } from "react-native";
import Animated, { css, cubicBezier } from "react-native-reanimated";

export const starOn = css.keyframes({
  "0%": { transform: [{ scale: 0.85 }] },
  "35%": { transform: [{ scale: 1.25 }] },
  "65%": { transform: [{ scale: 0.95 }] },
  "100%": { transform: [{ scale: 1 }] },
});

const ring = css.keyframes({
  from: { transform: [{ scale: 0.5 }], opacity: 0.7 },
  to: { transform: [{ scale: 1.4 }], opacity: 0 },
});

const dot = css.keyframes({
  from: { transform: [{ translateY: -9 }, { scale: 1 }], opacity: 1 },
  to: { transform: [{ translateY: -19 }, { scale: 0.4 }], opacity: 0 },
});

export const starTiming = {
  animationDuration: duration.flash,
  animationTimingFunction: cubicBezier(...easing.standard),
  animationFillMode: "both",
} as const;

const rays = [0, 60, 120, 180, 240, 300];

export function StarBurst({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View
        style={[styles.ring, { borderColor: color, animationName: ring, ...starTiming }]}
      />
      {rays.map((angle) => (
        <View key={angle} style={[styles.overlay, { transform: [{ rotate: `${angle}deg` }] }]}>
          <Animated.View
            style={[styles.dot, { backgroundColor: color, animationName: dot, ...starTiming }]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
});

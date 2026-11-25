import { useT } from "@mini/core";
import { duration, easing, radius } from "@mini/tokens";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { css, cubicBezier } from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { usePalette, type Palette } from "../theme/palette.ts";

const starOn = css.keyframes({
  from: { transform: [{ scale: 0.85 }] },
  to: { transform: [{ scale: 1 }] },
});

export interface StarButtonProps {
  name: string;
  starred: boolean | undefined;
  onToggle: () => void;
  testID: string;
}

function starTone(starred: boolean | undefined, palette: Palette): string {
  if (starred === undefined) return palette.border;
  return starred ? palette.accentFill : palette.textMuted;
}

export function StarButton({ name, starred, onToggle, testID }: StarButtonProps) {
  const t = useT();
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="togglebutton"
      accessibilityLabel={t("star.label", { name })}
      accessibilityState={{ checked: starred === true, disabled: starred === undefined }}
      disabled={starred === undefined}
      onPress={onToggle}
      style={styles.button}
    >
      <Animated.View style={starred === true && !reduceMotion && motion.starOn}>
        <Text style={[styles.icon, { color: starTone(starred, palette) }]}>
          {starred === true ? "★" : "☆"}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const motion = css.create({
  starOn: {
    animationName: starOn,
    animationDuration: duration.fast,
    animationTimingFunction: cubicBezier(...easing.standard),
    animationFillMode: "both",
  },
});

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  icon: { fontSize: 20, lineHeight: 24 },
});

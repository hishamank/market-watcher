import { useT } from "@mini/core";
import { radius } from "@mini/tokens";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { tapHaptic } from "../platform/haptics.ts";
import { usePalette, type Palette } from "../theme/palette.ts";
import { Icon } from "./icon.tsx";
import { StarBurst, starOn, starTiming } from "./star-burst.tsx";

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
  const [celebrate, setCelebrate] = useState(false);
  const playing = celebrate && starred === true && !reduceMotion;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="togglebutton"
      accessibilityLabel={t("star.label", { name })}
      accessibilityState={{ checked: starred === true, disabled: starred === undefined }}
      disabled={starred === undefined}
      onPress={() => {
        setCelebrate(starred === false && !reduceMotion);
        tapHaptic();
        onToggle();
      }}
      style={styles.button}
    >
      {playing ? <StarBurst color={palette.accentFill} /> : null}
      <Animated.View
        onCSSAnimationEnd={() => setCelebrate(false)}
        style={playing ? { animationName: starOn, ...starTiming } : undefined}
      >
        <Icon name="star" color={starTone(starred, palette)} filled={starred === true} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});

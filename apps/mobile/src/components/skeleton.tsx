import { radius, space } from "@mini/tokens";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { css } from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { usePalette } from "../theme/palette.ts";
import { ROW_MIN_HEIGHT } from "./stock-row.tsx";

const SKELETON_ROWS = 8;

const pulse = css.keyframes({
  "0%": { opacity: 1 },
  "50%": { opacity: 0.55 },
  "100%": { opacity: 1 },
});

function SkeletonBlock({ style }: { style: ViewStyle }) {
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      style={[style, { backgroundColor: palette.fill }, !reduceMotion && motion.pulse]}
    />
  );
}

export function SkeletonRow() {
  const palette = usePalette();
  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.names}>
        <SkeletonBlock style={styles.name} />
        <SkeletonBlock style={styles.symbol} />
      </View>
      <View style={styles.numbers}>
        <SkeletonBlock style={styles.price} />
        <SkeletonBlock style={styles.pill} />
      </View>
      <View style={styles.star} />
    </View>
  );
}

export function ListSkeleton({ testID }: { testID: string }) {
  return (
    <View testID={testID}>
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </View>
  );
}

const motion = css.create({
  pulse: {
    animationName: pulse,
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_MIN_HEIGHT,
    paddingStart: space[16],
    paddingEnd: space[6],
    gap: space[12],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  names: { flex: 1, alignItems: "flex-start", gap: space[6] },
  numbers: { alignItems: "flex-end", gap: space[6] },
  name: { width: 140, height: 16, borderRadius: radius.xs },
  symbol: { width: 48, height: 12, borderRadius: radius.xs },
  price: { width: 64, height: 16, borderRadius: radius.xs },
  pill: { width: 112, height: 20, borderRadius: radius.pill },
  star: { width: 44, height: 44 },
});

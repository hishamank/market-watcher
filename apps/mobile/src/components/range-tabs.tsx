import { RANGES, type Range } from "@mini/contracts";
import { useLanguage, useT } from "@mini/core";
import { duration, easing, radius, space } from "@mini/tokens";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { useElevation, usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export interface RangeTabsProps {
  range: Range;
  onSelect: (range: Range) => void;
}

type Layouts = Partial<Record<Range, LayoutRectangle>>;

function offsetX(option: LayoutRectangle, trackWidth: number, rtl: boolean): number {
  return rtl ? option.x + option.width - trackWidth : option.x;
}

export function RangeTabs({ range, onSelect }: RangeTabsProps) {
  const textStyles = useTextStyles();
  const t = useT();
  const { direction } = useLanguage();
  const palette = usePalette();
  const raised = useElevation(1);
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = useState<Layouts>({});
  const [trackWidth, setTrackWidth] = useState(0);
  const selected = layouts[range];
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("detail.rangeTabs")}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: palette.fill }]}
    >
      {selected === undefined ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              backgroundColor: palette.raised,
              boxShadow: raised,
              width: selected.width,
              height: selected.height,
              transform: [
                { translateX: offsetX(selected, trackWidth, direction === "rtl") },
                { translateY: selected.y },
              ],
              transitionProperty: ["transform", "width"],
              transitionDuration: reduceMotion ? 0 : duration.base,
              transitionTimingFunction: cubicBezier(...easing.standard),
            },
          ]}
        />
      )}
      {RANGES.map((option) => {
        const isSelected = option === range;
        return (
          <Pressable
            key={option}
            testID={`range-tab-${option}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option)}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setLayouts((previous) => ({ ...previous, [option]: layout }));
            }}
            style={({ pressed }) => [
              styles.option,
              isSelected &&
                selected === undefined && { backgroundColor: palette.raised, boxShadow: raised },
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                textStyles.label,
                { color: isSelected ? palette.text : palette.textSecondary },
                isSelected && styles.selectedLabel,
              ]}
            >
              {t(`detail.tab.${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: space[4],
    gap: space[2],
    borderRadius: radius.lg,
  },
  indicator: {
    position: "absolute",
    start: 0,
    top: 0,
    borderRadius: radius.sm,
  },
  option: {
    flexGrow: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space[8],
    borderRadius: radius.sm,
  },
  pressed: { opacity: 0.7 },
  selectedLabel: { fontWeight: 600 },
});

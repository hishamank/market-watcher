import type { TextDirection } from "@mini/core";
import { duration, easing, radius, space } from "@mini/tokens";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { useElevation, usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  testID: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  direction: TextDirection;
  onSelect: (value: T) => void;
}

function offsetX(option: LayoutRectangle, trackWidth: number, rtl: boolean): number {
  return rtl ? option.x + option.width - trackWidth : option.x;
}

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { label, options, value, direction, onSelect } = props;
  const textStyles = useTextStyles();
  const palette = usePalette();
  const raised = useElevation(1);
  const reduceMotion = useReduceMotion();
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const [trackWidth, setTrackWidth] = useState(0);
  const selected = layouts[value];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
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
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onSelect(option.value)}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setLayouts((previous) => ({ ...previous, [option.value]: layout }));
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
              {option.label}
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
    flexBasis: 0,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space[8],
    borderRadius: radius.sm,
  },
  pressed: { opacity: 0.7 },
  selectedLabel: { fontWeight: 600 },
});

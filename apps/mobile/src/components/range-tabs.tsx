import { RANGES, type Range } from "@mini/contracts";
import { useT } from "@mini/core";
import { radius, space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useElevation, usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";

export interface RangeTabsProps {
  range: Range;
  onSelect: (range: Range) => void;
}

export function RangeTabs({ range, onSelect }: RangeTabsProps) {
  const t = useT();
  const palette = usePalette();
  const raised = useElevation(1);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("detail.rangeTabs")}
      style={[styles.track, { backgroundColor: palette.fill }]}
    >
      {RANGES.map((option) => {
        const selected = option === range;
        return (
          <Pressable
            key={option}
            testID={`range-tab-${option}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option)}
            style={[
              styles.option,
              selected && { backgroundColor: palette.raised, boxShadow: raised },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                textStyles.label,
                { color: selected ? palette.text : palette.textSecondary },
                selected && styles.selectedLabel,
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
  option: {
    flexGrow: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space[8],
    borderRadius: radius.sm,
  },
  selectedLabel: { fontWeight: 600 },
});

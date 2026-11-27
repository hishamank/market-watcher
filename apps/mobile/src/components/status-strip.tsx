import { space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export function StatusStrip({ palette, children }: { palette: Palette; children?: ReactNode }) {
  const textStyles = useTextStyles();
  return (
    <View
      testID="status-strip"
      accessibilityLiveRegion="polite"
      style={[styles.strip, { backgroundColor: palette.fill, borderBottomColor: palette.border }]}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[textStyles.caption, styles.lineHeightHolder]}
      >
        {"​"}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
    paddingHorizontal: space[16],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineHeightHolder: { width: 0, marginEnd: -space[12] },
});

import { space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { Palette } from "../theme/palette.ts";

export function StatusStrip({ palette, children }: { palette: Palette; children?: ReactNode }) {
  return (
    <View
      testID="status-strip"
      accessibilityLiveRegion="polite"
      style={[styles.strip, { backgroundColor: palette.fill, borderBottomColor: palette.border }]}
    >
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
});

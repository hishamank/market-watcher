import { space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export function ChaosSection({ title, children }: { title: string; children: ReactNode }) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View style={[styles.section, { borderTopColor: palette.border }]}>
      <Text accessibilityRole="header" style={[textStyles.label, { color: palette.textSecondary }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[12],
    paddingTop: space[12],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

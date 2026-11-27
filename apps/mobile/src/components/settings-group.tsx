import { radius, space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export interface SettingsGroupProps {
  title: string;
  children: ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={[textStyles.label, styles.title, { color: palette.textSecondary }]}
      >
        {title}
      </Text>
      <View
        style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[8] },
  title: { paddingInline: space[16] },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});

import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Icon } from "./icon.tsx";
import { ltr } from "./ltr.ts";

export interface CountdownPillProps {
  label: string | null;
  testID: string;
}

export function CountdownPill({ label, testID }: CountdownPillProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  if (label === null) return null;
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: palette.staleTint }]}>
      <Icon name="clock" color={palette.stale} size={14} />
      <Text style={[textStyles.caption, styles.text, { color: palette.stale }]}>{ltr(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    paddingInline: space[8],
    paddingBlock: space[2],
    borderRadius: radius.pill,
  },
  text: { fontWeight: 500 },
});

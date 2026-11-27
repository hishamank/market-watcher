import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Icon } from "./icon.tsx";

export interface ChoiceRowProps {
  label: string;
  testID: string;
  selected: boolean;
  divider: boolean;
  onPress: () => void;
}

export function ChoiceRow({ label, testID, selected, divider, onPress }: ChoiceRowProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.hover }]}
    >
      <Text style={[textStyles.body, styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.check}>
        {selected ? <Icon name="check" color={palette.accent} /> : null}
      </View>
      {divider ? <View style={[styles.divider, { backgroundColor: palette.border }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingInline: space[16],
    paddingBlock: space[10],
  },
  label: { flex: 1 },
  check: { width: 20, height: 20 },
  divider: {
    position: "absolute",
    bottom: 0,
    start: space[16],
    end: 0,
    height: StyleSheet.hairlineWidth,
  },
});

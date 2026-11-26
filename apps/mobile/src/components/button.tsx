import { radius, space } from "@mini/tokens";
import { Pressable, StyleSheet, Text } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  testID: string;
}

export function Button({ label, onPress, testID }: ButtonProps) {
  const palette = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.text },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[textStyles.label, { color: palette.surface }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingInline: space[16],
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});

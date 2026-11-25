import { StyleSheet, Text, type ColorValue } from "react-native";

export function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={[styles.icon, { color }]}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  icon: { fontSize: 20, lineHeight: 24 },
});

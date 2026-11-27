import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";

export interface HealthTile {
  label: string;
  value: string;
  testID: string;
}

export function HealthTiles({ tiles }: { tiles: readonly HealthTile[] }) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.testID} style={[styles.tile, { backgroundColor: palette.fill }]}>
          <Text testID={tile.testID} style={[textStyles.headingMd, { color: palette.text }]}>
            {ltr(tile.value)}
          </Text>
          <Text style={[textStyles.caption, { color: palette.textSecondary }]}>{tile.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space[8] },
  tile: {
    flexGrow: 1,
    flexBasis: "40%",
    gap: space[2],
    paddingInline: space[12],
    paddingBlock: space[10],
    borderRadius: radius.md,
  },
});

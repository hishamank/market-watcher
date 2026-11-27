import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Icon } from "./icon.tsx";

interface MarketClosedLabelProps {
  label: string;
  palette: Palette;
}

export function MarketClosedLabel({ label, palette }: MarketClosedLabelProps) {
  const textStyles = useTextStyles();
  return (
    <View testID="market-status-label" accessible style={styles.label}>
      <Icon name="moon" color={palette.textSecondary} size={16} />
      <Text style={[textStyles.caption, styles.word, { color: palette.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { flexDirection: "row", alignItems: "center", gap: space[6] },
  word: { fontWeight: "500" },
});

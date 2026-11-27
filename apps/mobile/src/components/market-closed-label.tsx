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
    <View testID="market-status-label" accessible accessibilityLabel={label} style={styles.label}>
      <Icon name="moon" color={palette.textSecondary} size={16} />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[textStyles.caption, styles.word, { color: palette.textSecondary }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { flexDirection: "row", alignItems: "center", gap: space[6], flexShrink: 1 },
  word: { fontWeight: "500", flexShrink: 1 },
});

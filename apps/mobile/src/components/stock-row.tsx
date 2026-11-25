import type { FlashDirection } from "@mini/core";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { ChangePill } from "./change-pill.tsx";
import { ltr } from "./ltr.ts";
import { PriceText } from "./price-text.tsx";
import { StarButton } from "./star-button.tsx";

export const ROW_MIN_HEIGHT = 68;

export interface StockRowProps {
  testID: string;
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  starred: boolean | undefined;
  onOpen: () => void;
  onToggleStar: () => void;
}

export function StockRow(props: StockRowProps) {
  const { symbol, name, stale } = props;
  const palette = usePalette();
  return (
    <View
      testID={props.testID}
      style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Pressable
        accessibilityRole="link"
        onPress={props.onOpen}
        style={({ pressed }) => [styles.link, pressed && { backgroundColor: palette.hover }]}
      >
        <View style={styles.names}>
          <Text
            testID={`stock-row-name-${symbol}`}
            numberOfLines={1}
            style={[textStyles.bodyStrong, { color: palette.text }]}
          >
            {name}
          </Text>
          <Text style={[textStyles.caption, { color: palette.textMuted }]}>{ltr(symbol)}</Text>
        </View>
        <View style={styles.numbers}>
          <PriceText price={props.price} stale={stale} testID={`stock-row-price-${symbol}`} />
          <ChangePill
            change={props.change}
            changePercent={props.changePercent}
            stale={stale}
            flash={props.flash}
            flashKey={props.flashKey}
            testID={`stock-row-change-${symbol}`}
          />
        </View>
      </Pressable>
      <StarButton
        name={name}
        starred={props.starred}
        onToggle={props.onToggleStar}
        testID={`star-${symbol}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_MIN_HEIGHT,
    paddingStart: space[16],
    paddingEnd: space[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  link: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: space[12],
  },
  names: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: 3 },
  numbers: { alignItems: "flex-end", gap: space[4] },
});

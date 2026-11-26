import type { Change } from "@mini/contracts";
import type { FlashDirection } from "@mini/core";
import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { ChangePill } from "./change-pill.tsx";
import { ltr } from "./ltr.ts";
import { PriceText } from "./price-text.tsx";
import { QuoteAsOf } from "./quote-as-of.tsx";
import { StarButton } from "./star-button.tsx";

export interface DetailHeaderProps {
  symbol: string;
  name: string;
  price: string;
  rangeChange: Change | undefined;
  rangeLabel: string;
  asOf?: string | undefined;
  asOfHelp: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  starred: boolean | undefined;
  onToggleStar: () => void;
}

function UnknownChange() {
  const palette = usePalette();
  return (
    <View testID="detail-change" style={[styles.pill, { backgroundColor: palette.fill }]}>
      <Text style={[textStyles.change, { color: palette.flat }]}>{ltr("–")}</Text>
    </View>
  );
}

export function DetailHeader(props: DetailHeaderProps) {
  const { symbol, name, rangeChange, stale } = props;
  const palette = usePalette();
  return (
    <View testID="detail-header" style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <View style={[styles.pill, { backgroundColor: palette.fill }]}>
            <Text style={[textStyles.caption, styles.chip, { color: palette.textSecondary }]}>
              {ltr(symbol)}
            </Text>
          </View>
          <Text
            testID="detail-name"
            numberOfLines={1}
            style={[textStyles.body, { color: palette.textSecondary }]}
          >
            {name}
          </Text>
        </View>
        <StarButton
          name={name}
          starred={props.starred}
          onToggle={props.onToggleStar}
          testID="detail-star"
        />
      </View>
      <PriceText
        price={props.price}
        stale={stale}
        flash={props.asOf ? undefined : props.flash}
        flashKey={props.flashKey}
        testID="detail-price"
        display
      />
      <View style={styles.changeRow}>
        {rangeChange === undefined ? (
          <UnknownChange />
        ) : (
          <ChangePill
            change={rangeChange.change}
            changePercent={rangeChange.changePercent}
            stale={stale || !!props.asOf}
            testID="detail-change"
          />
        )}
        <Text
          testID="detail-change-label"
          style={[textStyles.label, styles.changeLabel, { color: palette.textSecondary }]}
        >
          {props.rangeLabel}
        </Text>
      </View>
      {props.asOf ? <QuoteAsOf label={props.asOf} help={props.asOfHelp} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[6] },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: space[12] },
  identity: { flex: 1, minWidth: 0, alignItems: "flex-start", gap: space[6] },
  pill: { borderRadius: radius.pill, paddingBlock: 3, paddingInline: space[10] },
  chip: { fontWeight: 500 },
  changeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[8] },
  changeLabel: { fontWeight: 400 },
});

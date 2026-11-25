import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { ListError } from "./list-error.tsx";
import { ltr } from "./ltr.ts";
import { ROW_MIN_HEIGHT } from "./stock-row.tsx";
import { StarButton } from "./star-button.tsx";

export interface WatchlistErrorRowProps {
  symbol: string;
  onRetry: () => void;
  onToggleStar: () => void;
}

export function WatchlistErrorRow({ symbol, onRetry, onToggleStar }: WatchlistErrorRowProps) {
  const palette = usePalette();
  return (
    <View
      testID={`watchlist-row-${symbol}`}
      style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.header}>
        <Text style={[textStyles.bodyStrong, styles.symbol, { color: palette.text }]}>
          {ltr(symbol)}
        </Text>
        <StarButton name={symbol} starred onToggle={onToggleStar} testID={`star-${symbol}`} />
      </View>
      <ListError onRetry={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    paddingStart: space[16],
    paddingEnd: space[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: "row", alignItems: "center", minHeight: ROW_MIN_HEIGHT },
  symbol: { flex: 1 },
});

import type { SearchMatch } from "@mini/contracts";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";
import { StarButton } from "./star-button.tsx";

export const SEARCH_ROW_MIN_HEIGHT = 56;

export interface SearchResultRowProps {
  match: SearchMatch;
  starred: boolean | undefined;
  onOpen: () => void;
  onToggleStar: () => void;
}

export function SearchResultRow({ match, starred, onOpen, onToggleStar }: SearchResultRowProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View
      testID={`search-result-${match.symbol}`}
      style={[styles.row, { borderColor: palette.border }]}
    >
      <Pressable
        accessibilityRole="link"
        onPress={onOpen}
        style={({ pressed }) => [styles.link, pressed && { backgroundColor: palette.hover }]}
      >
        <Text style={[textStyles.label, styles.symbol, { color: palette.text }]}>
          {ltr(match.symbol)}
        </Text>
        <Text
          numberOfLines={1}
          style={[textStyles.label, styles.name, { color: palette.textSecondary }]}
        >
          {ltr(match.name)}
        </Text>
      </Pressable>
      <StarButton
        name={match.name}
        starred={starred}
        onToggle={onToggleStar}
        testID={`search-result-star-${match.symbol}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: SEARCH_ROW_MIN_HEIGHT,
    paddingEnd: space[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  link: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: space[12],
    paddingStart: space[16],
    paddingEnd: space[8],
  },
  symbol: { width: 60, fontWeight: 600 },
  name: { flex: 1, minWidth: 0, fontWeight: 400 },
});

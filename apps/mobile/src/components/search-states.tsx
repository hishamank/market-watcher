import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";
import { Icon } from "./icon.tsx";
import { SEARCH_ROW_MIN_HEIGHT } from "./search-result-row.tsx";
import { SkeletonBlock } from "./skeleton.tsx";

const SKELETON_ROWS = [0, 1, 2, 3] as const;

export interface SearchMessageProps {
  testID: string;
  icon: "search" | "alert";
  title: string;
  help: string;
  action?: { label: string; testID: string; onPress: () => void };
}

export function SearchMessage({ testID, icon, title, help, action }: SearchMessageProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View testID={testID} style={styles.message}>
      <View style={[styles.badge, { backgroundColor: palette.fill }]}>
        {icon === "search" ? (
          <Icon name="search" color={palette.textSecondary} />
        ) : (
          <Text style={[textStyles.bodyStrong, { color: palette.textSecondary }]}>!</Text>
        )}
      </View>
      <Text style={[textStyles.bodyStrong, styles.centred, { color: palette.text }]}>{title}</Text>
      <Text style={[textStyles.label, styles.help, { color: palette.textSecondary }]}>{help}</Text>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} testID={action.testID} />
        </View>
      ) : null}
    </View>
  );
}

export function SearchSkeleton() {
  const palette = usePalette();
  return (
    <View testID="search-skeleton">
      {SKELETON_ROWS.map((row) => (
        <View key={row} style={[styles.row, { borderColor: palette.border }]}>
          <SkeletonBlock style={styles.symbol} />
          <SkeletonBlock style={styles.name} />
          <View style={styles.star}>
            <SkeletonBlock style={styles.starDot} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    alignItems: "center",
    gap: space[6],
    paddingInline: space[20],
    paddingBlock: space[24],
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBlockEnd: space[4],
  },
  centred: { textAlign: "center" },
  help: { maxWidth: 280, fontWeight: 400, textAlign: "center" },
  action: { marginBlockStart: space[8] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
    minHeight: SEARCH_ROW_MIN_HEIGHT,
    paddingStart: space[16],
    paddingEnd: space[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  symbol: { width: 52, height: 16, borderRadius: radius.xs },
  name: { flex: 1, height: 14, borderRadius: radius.xs },
  star: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  starDot: { width: 20, height: 20, borderRadius: radius.pill },
});

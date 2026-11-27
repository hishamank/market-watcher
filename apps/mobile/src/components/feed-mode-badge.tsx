import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

interface FeedModeBadgeProps {
  live: boolean;
  label: string;
  palette: Palette;
}

export function FeedModeBadge({ live, label, palette }: FeedModeBadgeProps) {
  const textStyles = useTextStyles();
  return (
    <View testID="feed-mode-badge" accessible style={styles.badge}>
      <View
        style={[
          styles.dot,
          { borderColor: palette.textSecondary },
          live && { backgroundColor: palette.textSecondary },
        ]}
      />
      <Text style={[textStyles.caption, styles.word, { color: palette.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: space[6] },
  dot: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.5 },
  word: { fontWeight: "500" },
});

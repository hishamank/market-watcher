import { useT, useWatchlist } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../components/button.tsx";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export function WatchlistError() {
  const t = useT();
  const { saveFailed, dismissError } = useWatchlist();
  const palette = usePalette();
  const textStyles = useTextStyles();
  if (!saveFailed) return null;
  return (
    <View style={[styles.banner, { backgroundColor: palette.surface }]}>
      <Text
        accessibilityLiveRegion="assertive"
        style={[textStyles.label, styles.copy, { color: palette.text }]}
      >
        {t("watchlist.toast.error")}
      </Text>
      <Button
        testID="watchlist-error-dismiss"
        label={t("watchlist.toast.dismiss")}
        onPress={dismissError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", padding: space[12], gap: space[8] },
  copy: { flex: 1 },
});

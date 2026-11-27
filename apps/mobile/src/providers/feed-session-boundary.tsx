import { useFeedSession, useT } from "@mini/core";
import { space } from "@mini/tokens";
import { useTextStyles } from "../theme/text-styles.ts";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";

export function FeedSessionBoundary({ children }: { children: ReactNode }) {
  const { reloadRequired } = useFeedSession();
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  if (!reloadRequired) return children;
  return (
    <View
      testID="feed-reload-required"
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: palette.bg }]}
    >
      <Text style={[textStyles.headingMd, styles.centred, { color: palette.text }]}>
        {t("feedChanged.title")}
      </Text>
      <Text style={[textStyles.body, styles.centred, { color: palette.text }]}>
        {t("feedChanged.mobileHelp")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: space[24],
    gap: space[16],
  },
  centred: { textAlign: "center" },
});

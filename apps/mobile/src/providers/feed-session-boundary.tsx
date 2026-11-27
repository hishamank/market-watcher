import { useFeedSession, useT } from "@mini/core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";

export function FeedSessionBoundary({ children }: { children: ReactNode }) {
  const { reloadRequired } = useFeedSession();
  const t = useT();
  const palette = usePalette();
  if (!reloadRequired) return children;
  return (
    <View
      testID="feed-reload-required"
      accessibilityRole="alert"
      style={[styles.root, { backgroundColor: palette.bg }]}
    >
      <Text style={[styles.title, { color: palette.text }]}>{t("feedChanged.title")}</Text>
      <Text style={[styles.help, { color: palette.text }]}>{t("feedChanged.mobileHelp")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center" },
  help: { fontSize: 16, textAlign: "center" },
});

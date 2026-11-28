import { useT, type StockNewsView } from "@mini/core";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { NewsContent } from "./news-content.tsx";

export interface StockNewsProps {
  view: StockNewsView;
  onOpen: (position: number) => void;
}

export function StockNews({ view, onOpen }: StockNewsProps) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  if (view.status === "empty") return null;
  return (
    <View testID="stock-news" style={[styles.section, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[text.headingMd, { color: palette.text }]}>
        {t("news.title")}
      </Text>
      {view.status === "ready" ? (
        <NewsContent view={view} onOpen={onOpen} />
      ) : (
        <>
          <Text style={[text.body, { color: palette.textSecondary }]}>
            {t(view.status === "loading" ? "news.loading" : "news.error")}
          </Text>
          {view.status === "error" && (
            <Pressable
              testID="news-retry"
              accessibilityRole="button"
              onPress={view.retry}
              style={styles.action}
            >
              <Text style={[text.label, { color: palette.text }]}>{t("profile.retry")}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingTop: space[24], marginTop: space[8], gap: space[16] },
  action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
});

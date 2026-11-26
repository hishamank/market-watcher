import { useT, type StockNewsView } from "@mini/core";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { NewsContent } from "./news-content.tsx";

export function StockNews({ view }: { view: StockNewsView }) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <View testID="stock-news" style={[styles.section, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[text.headingMd, { color: palette.text }]}>
        {t("news.title")}
      </Text>
      {view.status === "ready" ? (
        <NewsContent view={view} />
      ) : (
        <>
          <Text style={[text.body, { color: palette.textSecondary }]}>
            {t(
              view.status === "loading"
                ? "news.loading"
                : view.status === "empty"
                  ? "news.empty"
                  : "news.error",
            )}
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

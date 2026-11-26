import { useT, type StockStatisticsView } from "@mini/core";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { StatisticsContent } from "./statistics-content.tsx";

export function StockStatistics({ view }: { view: StockStatisticsView }) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <View testID="stock-statistics" style={[styles.section, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[text.headingMd, { color: palette.text }]}>
        {t("statistics.title")}
      </Text>
      {view.status === "ready" ? (
        <StatisticsContent view={view} />
      ) : (
        <>
          <Text style={[text.body, { color: palette.textSecondary }]}>
            {t(
              view.status === "loading"
                ? "statistics.loading"
                : view.status === "empty"
                  ? "statistics.empty"
                  : "statistics.error",
            )}
          </Text>
          {view.status === "error" && (
            <Pressable
              testID="statistics-retry"
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

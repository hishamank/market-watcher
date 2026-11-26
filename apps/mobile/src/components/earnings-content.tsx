import { useT, type StockEarningsView } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { EarningsChart } from "./earnings-chart.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsContent({ view }: { view: ReadyEarnings }) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <>
      <View style={styles.summary}>
        {view.next && (
          <View testID="earnings-next" style={styles.fact}>
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.next")}
            </Text>
            <Text style={[text.bodyStrong, { color: palette.text }]}>{view.next.date}</Text>
            <Text style={[text.caption, { color: palette.textMuted }]}>{view.next.confidence}</Text>
          </View>
        )}
        {view.latest && (
          <View testID="earnings-latest" style={styles.fact}>
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.latest")} · {view.latest.quarter}
            </Text>
            <Text style={[text.headingMd, { color: palette.text, writingDirection: "ltr" }]}>
              {view.latest.actual}
            </Text>
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.estimate")} {view.latest.estimate}
            </Text>
          </View>
        )}
      </View>
      {view.quarters.length > 0 && <EarningsChart view={view} />}
      <Text testID="earnings-source" style={[text.caption, { color: palette.textMuted }]}>
        {view.attribution}
        {view.retrieved ? `\n${view.retrieved}` : ""}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", flexWrap: "wrap", gap: space[20] },
  fact: { flexGrow: 1, flexBasis: "40%", gap: space[8] },
});

import { useLocale, useT, type StockEarningsView } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { EarningsChart } from "./earnings-chart.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsContent({ view }: { view: ReadyEarnings }) {
  const t = useT();
  const locale = useLocale();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <>
      <View style={[styles.summary, view.next && view.next.needsWideSummary && styles.stacked]}>
        {view.latest && (
          <View
            testID="earnings-latest"
            style={[styles.fact, view.next?.needsWideSummary && styles.stackedFact]}
          >
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.latest")}
            </Text>
            <Text
              style={[
                text.display,
                styles.amount,
                { color: palette.text, textAlign: locale === "ar" ? "right" : "left" },
              ]}
            >
              {view.latest.actual}
            </Text>
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.estimate")} {view.latest.estimate}
            </Text>
            <Text style={[text.caption, { color: palette.textMuted }]}>{view.latest.quarter}</Text>
          </View>
        )}
        {view.next && (
          <View
            testID="earnings-next"
            style={[
              styles.fact,
              view.next.needsWideSummary && styles.stackedFact,
              view.latest && (view.next.needsWideSummary ? styles.nextStacked : styles.next),
              { borderColor: palette.border },
            ]}
          >
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.next")}
            </Text>
            <Text style={[text.bodyStrong, { color: palette.text }]}>
              {view.next.dates.join(" – ")}
            </Text>
            <View style={[styles.badge, { borderColor: palette.border }]}>
              <Text style={[text.caption, { color: palette.textSecondary }]}>
                {view.next.confidence}
              </Text>
            </View>
          </View>
        )}
      </View>
      {view.quarters.length > 0 && <EarningsChart view={view} />}
      <Text testID="earnings-source" style={[text.caption, { color: palette.textMuted }]}>
        {view.attribution}
        {view.retrieved ? `\u00a0· ${view.retrieved}` : ""}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", gap: space[20], marginTop: space[8] },
  fact: { flexGrow: 1, flexBasis: 0, minWidth: 0, gap: space[8] },
  stacked: { flexDirection: "column" },
  stackedFact: { flexGrow: 0, flexBasis: "auto" },
  nextStacked: { borderTopWidth: 1, paddingTop: space[20] },
  amount: { fontSize: 32, lineHeight: 40 },
  next: { borderStartWidth: 1, paddingStart: space[20] },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: space[8],
    paddingVertical: space[4],
  },
});

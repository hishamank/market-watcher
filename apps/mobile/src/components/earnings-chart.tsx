import { useT, type StockEarningsView } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

function Quarter({ quarter, zero }: { quarter: ReadyEarnings["quarters"][number]; zero: number }) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <View style={styles.quarter}>
      <View accessible={false} style={styles.plot}>
        <View style={[styles.zero, { bottom: `${zero}%`, borderColor: palette.border }]} />
        {quarter.actualBar && (
          <View
            style={[
              styles.bar,
              {
                start: "15%",
                bottom: `${quarter.actualBar.bottom}%`,
                height: `${quarter.actualBar.height}%`,
                backgroundColor: palette.text,
              },
            ]}
          />
        )}
        {quarter.estimateBar && (
          <View
            style={[
              styles.bar,
              styles.estimate,
              {
                start: "55%",
                bottom: `${quarter.estimateBar.bottom}%`,
                height: `${quarter.estimateBar.height}%`,
                backgroundColor: palette.fill,
                borderColor: palette.borderStrong,
              },
            ]}
          />
        )}
      </View>
      <Text style={[text.caption, styles.center, { color: palette.textSecondary }]}>
        {quarter.label}
      </Text>
      <Text
        accessibilityLabel={`${t("earnings.actual")} ${quarter.actual}`}
        style={[text.label, styles.center, { color: palette.text }]}
      >
        {quarter.actual}
      </Text>
      <Text
        accessibilityLabel={`${t("earnings.estimate")} ${quarter.estimate}`}
        style={[text.caption, styles.center, { color: palette.textSecondary }]}
      >
        {quarter.estimate}
      </Text>
    </View>
  );
}

export function EarningsChart({ view }: { view: ReadyEarnings }) {
  const t = useT();
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <View testID="earnings-chart" style={[styles.section, { borderColor: palette.border }]}>
      <Text style={[text.label, { color: palette.text }]}>{t("earnings.history")}</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: palette.text }]} />
          <Text style={[text.caption, { color: palette.textSecondary }]}>
            {t("earnings.actual")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.dot,
              styles.estimate,
              { backgroundColor: palette.fill, borderColor: palette.borderStrong },
            ]}
          />
          <Text style={[text.caption, { color: palette.textSecondary }]}>
            {t("earnings.estimate")}
          </Text>
        </View>
      </View>
      <View style={styles.chart}>
        {view.quarters.map((quarter) => (
          <Quarter key={quarter.id} quarter={quarter} zero={view.zero} />
        ))}
      </View>
      <Text style={[text.caption, { color: palette.textMuted }]}>{view.basis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingTop: space[20], gap: space[12] },
  legend: { flexDirection: "row", gap: space[16] },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space[6] },
  dot: { height: 8, width: 8 },
  chart: { flexDirection: "row", direction: "ltr", gap: space[12] },
  quarter: { flex: 1, gap: space[6] },
  plot: { height: 120, marginBottom: space[6] },
  bar: { position: "absolute", width: "30%", borderTopStartRadius: 2, borderTopEndRadius: 2 },
  estimate: { borderWidth: 1, borderStyle: "dashed" },
  zero: { position: "absolute", start: 0, end: 0, borderTopWidth: 1 },
  center: { textAlign: "center", writingDirection: "ltr", fontVariant: ["tabular-nums"] },
});

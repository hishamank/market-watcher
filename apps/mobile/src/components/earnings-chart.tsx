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
        <View style={styles.plotInner}>
          <View style={[styles.zero, { bottom: `${zero}%`, borderColor: palette.border }]} />
          {quarter.actualBar && (
            <View
              style={[
                styles.bar,
                {
                  start: "50%",
                  marginStart: -17,
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
                  start: "50%",
                  marginStart: 3,
                  bottom: `${quarter.estimateBar.bottom}%`,
                  height: `${quarter.estimateBar.height}%`,
                  backgroundColor: palette.fill,
                  borderColor: palette.borderStrong,
                },
              ]}
            />
          )}
        </View>
      </View>
      <Text
        style={[text.caption, styles.center, styles.quarterLabel, { color: palette.textSecondary }]}
      >
        {quarter.label}
      </Text>
      <Text
        accessibilityLabel={`${t("earnings.actual")} ${quarter.actual}`}
        style={[
          text.caption,
          styles.center,
          styles.value,
          {
            fontWeight: "500",
            color: palette.text,
            borderTopWidth: 1,
            borderColor: palette.border,
          },
        ]}
      >
        {quarter.actual}
      </Text>
      <Text
        accessibilityLabel={`${t("earnings.estimate")} ${quarter.estimate}`}
        style={[text.caption, styles.center, styles.value, { color: palette.textSecondary }]}
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
    <View
      testID="earnings-chart"
      style={[
        styles.section,
        (view.latest || view.next) && styles.divider,
        { borderColor: palette.border },
      ]}
    >
      <Text style={[text.label, { color: palette.text }]}>{t("earnings.history")}</Text>
      <View style={styles.chart}>
        <View style={styles.labels}>
          <View style={styles.labelSpacer} />
          <View style={[styles.rowLabel, { borderTopWidth: 1, borderColor: palette.border }]}>
            <View style={[styles.dot, { backgroundColor: palette.text }]} />
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.actual")}
            </Text>
          </View>
          <View style={styles.rowLabel}>
            <View
              style={[
                styles.dot,
                styles.estimate,
                { borderColor: palette.borderStrong, backgroundColor: palette.fill },
              ]}
            />
            <Text style={[text.caption, { color: palette.textSecondary }]}>
              {t("earnings.estimateShort")}
            </Text>
          </View>
        </View>
        {view.quarters.map((quarter) => (
          <Quarter key={quarter.id} quarter={quarter} zero={view.zero} />
        ))}
      </View>
      <Text style={[text.caption, { color: palette.textMuted }]}>{view.basis}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[16] },
  divider: { borderTopWidth: 1, paddingTop: space[20] },
  labels: { width: 56 },
  labelSpacer: { height: 180 },
  rowLabel: { height: 32, flexDirection: "row", alignItems: "center", gap: space[4] },
  dot: { height: 8, width: 8, borderRadius: 1 },
  chart: { flexDirection: "row", direction: "ltr", marginTop: space[8] },
  quarter: { flex: 1, minWidth: 0 },
  plot: { height: 136 },
  plotInner: { position: "absolute", start: 0, end: 0, top: space[8], bottom: space[8] },
  quarterLabel: { height: 44, textAlignVertical: "center", paddingTop: space[12] },
  value: { height: 32, paddingTop: space[6] },
  bar: { position: "absolute", width: 14, minHeight: 2, borderRadius: 3 },
  estimate: { borderWidth: 1 },
  zero: { position: "absolute", start: 0, end: 0, borderTopWidth: 1 },
  center: { textAlign: "center", writingDirection: "ltr", fontVariant: ["tabular-nums"] },
});

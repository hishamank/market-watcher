import { useT, type StockStatisticsView } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

type ReadyStatistics = Extract<StockStatisticsView, { status: "ready" }>;

function YearRange({ range }: { range: ReadyStatistics["range"] }) {
  const palette = usePalette();
  const text = useTextStyles();
  if (!range) return <Text style={{ color: palette.text }}>—</Text>;
  return (
    <View>
      <View style={{ direction: "ltr" }}>
        <View style={styles.endpoints}>
          {[range.low, range.high].map((value, index) => (
            <Text key={index} style={[text.label, { color: palette.text }]}>
              {value}
            </Text>
          ))}
        </View>
        <View accessible={false} style={[styles.track, { backgroundColor: palette.borderStrong }]}>
          {range.position !== null && (
            <View
              style={[
                styles.marker,
                {
                  start: `${range.position}%`,
                  backgroundColor: palette.text,
                  borderColor: palette.bg,
                },
              ]}
            />
          )}
        </View>
      </View>
      {range.priceLabel && (
        <Text style={[text.caption, { color: palette.textSecondary }]}>{range.priceLabel}</Text>
      )}
    </View>
  );
}

export function StatisticsContent({ view }: { view: ReadyStatistics }) {
  const palette = usePalette();
  const text = useTextStyles();
  const t = useT();
  return (
    <>
      <View style={styles.grid}>
        {view.facts.map((fact) => (
          <View key={fact.id} style={[styles.fact, { borderColor: palette.border }]}>
            <Text style={[text.caption, styles.label, { color: palette.textSecondary }]}>
              {fact.label}
            </Text>
            {fact.id === "yearRange" ? (
              <YearRange range={view.range} />
            ) : (
              <Text
                testID={`statistics-${fact.id}`}
                style={[text.headingMd, styles.number, { color: palette.text }]}
              >
                {fact.value}
              </Text>
            )}
          </View>
        ))}
      </View>
      <Text testID="statistics-source" style={[text.caption, { color: palette.textMuted }]}>
        {view.attribution}
        {view.retrieved ? `\n${t("statistics.note")}\n${view.retrieved}` : ""}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space[12],
  },
  fact: { width: "47%", borderTopWidth: 1, paddingBottom: space[8] },
  label: { paddingVertical: space[12] },
  number: { writingDirection: "ltr", fontVariant: ["tabular-nums"] },
  endpoints: { flexDirection: "row", justifyContent: "space-between", gap: space[4] },
  track: { height: 4, borderRadius: 2, marginVertical: space[8] },
  marker: {
    position: "absolute",
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    transform: [{ translateX: -5 }],
  },
});

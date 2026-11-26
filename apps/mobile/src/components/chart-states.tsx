import type { Change } from "@mini/contracts";
import { formatPrice, useT } from "@mini/core";
import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { PLOT_HEIGHT } from "../integrations/line-chart.tsx";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";
import { ChangePill } from "./change-pill.tsx";
import { ltr } from "./ltr.ts";
import { SkeletonBlock } from "./skeleton.tsx";

export interface ChartReadoutValue {
  readonly time: string;
  readonly price: string;
  readonly change: Change;
  readonly fraction: number;
}

export function ChartSkeleton() {
  return (
    <View testID="chart-skeleton" style={styles.fill}>
      <SkeletonBlock style={styles.plotSkeleton} />
      <View style={styles.axis}>
        <SkeletonBlock style={styles.tickSkeleton} />
        <SkeletonBlock style={styles.tickSkeleton} />
        <SkeletonBlock style={styles.tickSkeleton} />
      </View>
    </View>
  );
}

export function ChartError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  const palette = usePalette();
  return (
    <View testID="chart-error" style={[styles.error, { borderColor: palette.borderStrong }]}>
      <Text style={[styles.alert, { color: palette.error }]}>!</Text>
      <Text style={[textStyles.label, { color: palette.text }]}>{t("detail.chart.error")}</Text>
      <Button label={t("detail.chart.retry")} onPress={onRetry} testID="chart-retry" />
    </View>
  );
}

export function ChartAsOf({ label }: { label: string }) {
  const palette = usePalette();
  return (
    <View testID="chart-as-of" style={[styles.asOf, { backgroundColor: palette.staleTint }]}>
      <Text style={[textStyles.caption, { color: palette.text }]}>{`◷ ${label}`}</Text>
    </View>
  );
}

export function ChartReadout({ value }: { value: ChartReadoutValue }) {
  const palette = usePalette();
  const share = `${value.fraction * 100}%` as const;
  return (
    <View
      testID="chart-readout"
      style={[
        styles.readout,
        { start: share, transform: [{ translateX: `-${share}` }] },
        { backgroundColor: palette.raised, borderColor: palette.border },
      ]}
    >
      <Text style={[textStyles.caption, { color: palette.textSecondary }]}>{value.time}</Text>
      <Text style={[textStyles.change, { color: palette.text }]}>
        {ltr(formatPrice(value.price))}
      </Text>
      <ChangePill
        change={value.change.change}
        changePercent={value.change.changePercent}
        stale={false}
        testID="chart-readout-change"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  plotSkeleton: { height: PLOT_HEIGHT, borderRadius: radius.lg },
  axis: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tickSkeleton: { width: 40, height: 10, borderRadius: radius.xs },
  error: {
    height: PLOT_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: space[6],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.lg,
  },
  alert: { fontSize: 20, lineHeight: 24, fontWeight: 600 },
  asOf: {
    alignSelf: "flex-start",
    paddingBlock: 3,
    paddingInline: space[10],
    borderRadius: radius.pill,
  },
  readout: {
    position: "absolute",
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space[8],
    paddingBlock: space[4],
    paddingInline: space[10],
    borderWidth: 1,
    borderRadius: 10,
  },
});

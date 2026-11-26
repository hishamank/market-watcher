import { space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { LINE_CHART_HEIGHT } from "../integrations/line-chart.tsx";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import {
  ChartAsOf,
  ChartError,
  ChartReadout,
  ChartSkeleton,
  type ChartReadoutValue,
} from "./chart-states.tsx";
import { ltr } from "./ltr.ts";

export type ChartState = "loading" | "error" | "ready";

const STRIP_HEIGHT = 36;
const AXIS_HEIGHT = 24;

export interface PriceChartProps {
  state: ChartState;
  label: string;
  plot: ReactNode;
  axisLabels: readonly string[];
  previousCloseLabel: string | undefined;
  asOfLabel: string | undefined;
  readout: ChartReadoutValue | undefined;
  onRetry: () => void;
  onWidth: (width: number) => void;
}

function ChartStrip(props: PriceChartProps) {
  const textStyles = useTextStyles();
  const palette = usePalette();
  return (
    <View style={styles.strip}>
      {props.asOfLabel === undefined ? null : <ChartAsOf label={props.asOfLabel} />}
      {props.previousCloseLabel === undefined ? null : (
        <Text style={[textStyles.caption, styles.previousClose, { color: palette.textMuted }]}>
          {ltr(props.previousCloseLabel)}
        </Text>
      )}
      {props.readout === undefined ? null : <ChartReadout value={props.readout} />}
    </View>
  );
}

function ChartAxis({ labels }: { labels: readonly string[] }) {
  const textStyles = useTextStyles();
  const palette = usePalette();
  return (
    <View style={styles.axis}>
      {labels.map((label, index) => (
        <Text key={index} style={[textStyles.caption, { color: palette.textMuted }]}>
          {ltr(label)}
        </Text>
      ))}
    </View>
  );
}

function ChartBody(props: PriceChartProps) {
  if (props.state === "loading") return <ChartSkeleton />;
  if (props.state === "error") return <ChartError onRetry={props.onRetry} />;
  return (
    <>
      {props.plot}
      <ChartAxis labels={props.axisLabels} />
    </>
  );
}

export function PriceChart(props: PriceChartProps) {
  return (
    <View
      testID="price-chart"
      accessibilityLabel={props.label}
      accessibilityValue={{ text: props.state }}
      style={styles.chart}
      onLayout={(event: LayoutChangeEvent) => props.onWidth(event.nativeEvent.layout.width)}
    >
      <ChartStrip {...props} />
      <View style={styles.body}>
        <ChartBody {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { direction: "ltr" },
  strip: {
    height: STRIP_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  previousClose: { marginStart: "auto", paddingBlockStart: space[4] },
  body: { height: LINE_CHART_HEIGHT },
  axis: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: space[8],
    height: AXIS_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

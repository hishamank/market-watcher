import type { Bar } from "@mini/contracts";
import type { Direction } from "@mini/core";
import { chartArea } from "@mini/tokens";
import { useRef } from "react";
import { Stop } from "react-native-svg";
import { LineChart } from "react-native-wagmi-charts";
import { useChartPalette, usePalette } from "../theme/palette.ts";

export const PLOT_HEIGHT = 176;
const WAGMI_AXIS_RESERVE = 40;
export const LINE_CHART_HEIGHT = PLOT_HEIGHT + WAGMI_AXIS_RESERVE;

export interface LineChartPlotProps {
  bars: readonly Bar[];
  xDomain: [number, number] | undefined;
  referenceLine: string | undefined;
  width: number;
  direction: Direction;
  muted: boolean;
  onScrub: (index: number | undefined) => void;
}

function yRangeOf(values: readonly number[], reference: number | undefined) {
  const all = reference === undefined ? values : [...values, reference];
  return { min: Math.min(...all), max: Math.max(...all) };
}

function useScrubIndex(onScrub: LineChartPlotProps["onScrub"]) {
  const scrub = useRef({ active: false, index: -1 });
  const report = () => {
    const { active, index } = scrub.current;
    onScrub(active && index >= 0 ? index : undefined);
  };
  return {
    onIndex: (index: number) => {
      scrub.current.index = index;
      report();
    },
    onActivated: () => {
      scrub.current.active = true;
      report();
    },
    onEnded: () => {
      scrub.current = { active: false, index: -1 };
      report();
    },
  };
}

export function LineChartPlot(props: LineChartPlotProps) {
  const { bars, muted } = props;
  const palette = usePalette();
  const chart = useChartPalette();
  const scrub = useScrubIndex(props.onScrub);
  const points = bars.map((bar) => ({ timestamp: bar.time, value: Number(bar.close) }));
  const reference = props.referenceLine === undefined ? undefined : Number(props.referenceLine);
  const live = props.direction === "down" ? chart.lossLine : chart.gainLine;
  const line = muted ? palette.textMuted : live;
  return (
    <LineChart.Provider
      data={points}
      {...(props.xDomain === undefined ? {} : { xDomain: props.xDomain })}
      yRange={yRangeOf(
        points.map((point) => point.value),
        reference,
      )}
      onCurrentIndexChange={scrub.onIndex}
    >
      <LineChart width={props.width} height={LINE_CHART_HEIGHT}>
        <LineChart.Path color={line} width={2} pathProps={{ isTransitionEnabled: false }}>
          {muted ? null : (
            <LineChart.Gradient color={line}>
              <Stop offset="0%" stopColor={line} stopOpacity={chartArea.topOpacity} />
              <Stop offset="100%" stopColor={line} stopOpacity={chartArea.bottomOpacity} />
            </LineChart.Gradient>
          )}
          {reference === undefined ? null : (
            <LineChart.HorizontalLine
              at={{ value: reference }}
              color={chart.previousClose}
              lineProps={{ strokeWidth: 1, strokeDasharray: "4 4" }}
            />
          )}
          {muted ? null : (
            <LineChart.Dot
              at={points.length - 1}
              color={line}
              size={4}
              hasOuterDot
              outerSize={10}
              outerDotProps={{ opacity: 0.22 }}
            />
          )}
        </LineChart.Path>
        <LineChart.CursorLine
          snapToPoint
          color={chart.crosshair}
          showLabel={false}
          lineProps={{ strokeWidth: 1, strokeDasharray: [1, 0] }}
          onActivated={scrub.onActivated}
          onEnded={scrub.onEnded}
        />
      </LineChart>
    </LineChart.Provider>
  );
}

import { changeBetween, type Range } from "@mini/contracts";
import {
  directionOf,
  formatMarketTime,
  formatPrice,
  useLiveHistory,
  useLocale,
  useT,
  type LiveHistoryResult,
} from "@mini/core";
import { useState } from "react";
import type { ChartReadoutValue } from "../components/chart-states.tsx";
import { PriceChart, type ChartState } from "../components/price-chart.tsx";
import { LineChartPlot } from "../integrations/line-chart.tsx";
import { axisLabels, formatScrubTime } from "./chart-time.ts";
import { scrubPointOf, type ScrubPoint, type ScrubSelection } from "./scrub.ts";

export interface ConnectedPriceChartProps {
  symbol: string;
  range: Range;
  selection: ScrubSelection | undefined;
  onScrub: (index: number | undefined) => void;
}

function chartStateOf(history: LiveHistoryResult): ChartState {
  if (history.previousClose !== undefined && history.bars.length > 0) return "ready";
  return history.status === "error" ? "error" : "loading";
}

function readoutOf(
  range: Range,
  baseline: string | undefined,
  scrub: ScrubPoint | undefined,
  locale: string,
): ChartReadoutValue | undefined {
  if (scrub === undefined || baseline === undefined) return undefined;
  return {
    time: formatScrubTime(range, scrub.time, locale),
    price: scrub.close,
    change: changeBetween(baseline, scrub.close),
    fraction: scrub.fraction,
  };
}

function usePlotWidth() {
  const [width, setWidth] = useState(0);
  return { width, onWidth: (next: number) => setWidth(Math.round(next)) };
}

export function ConnectedPriceChart(props: ConnectedPriceChartProps) {
  const { symbol, range } = props;
  const t = useT();
  const locale = useLocale();
  const history = useLiveHistory(symbol, range);
  const { width, onWidth } = usePlotWidth();
  const { bars, session } = history;
  const previousClose = range === "1D" ? history.previousClose : undefined;
  return (
    <PriceChart
      state={chartStateOf(history)}
      label={t("detail.chart.label", { range: t(`detail.range.${range}`) })}
      plot={
        width === 0 ? null : (
          <LineChartPlot
            key={`${symbol}:${range}`}
            bars={bars}
            xDomain={session === undefined ? undefined : [session.open, session.close]}
            referenceLine={previousClose}
            width={width}
            direction={
              history.rangeChange === undefined ? "flat" : directionOf(history.rangeChange.change)
            }
            muted={history.ageMs !== undefined}
            onScrub={props.onScrub}
          />
        )
      }
      axisLabels={axisLabels(range, bars, session, locale)}
      previousCloseLabel={
        previousClose === undefined
          ? undefined
          : t("detail.chart.previousCloseLine", {
              price: formatPrice(previousClose).replace("$", ""),
            })
      }
      asOfLabel={
        history.asOf === undefined
          ? undefined
          : t("detail.chart.asOf", { time: formatMarketTime(history.asOf, { locale }) })
      }
      readout={readoutOf(
        range,
        history.baseline,
        scrubPointOf(props.selection, range, history),
        locale,
      )}
      onRetry={() => void history.refetch()}
      onWidth={onWidth}
    />
  );
}

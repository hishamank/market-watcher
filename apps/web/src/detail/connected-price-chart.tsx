"use client";

import { changeBetween, type Range } from "@mini/contracts";
import {
  directionOf,
  formatMarketDate,
  formatMarketDateTime,
  formatMarketTime,
  formatPrice,
  useLiveHistory,
  useLocale,
  useT,
  type LiveHistoryResult,
} from "@mini/core";
import type { ChartReadoutValue } from "../components/chart-states.tsx";
import { PriceChart, type ChartState } from "../components/price-chart.tsx";
import type { ChartFormatters } from "../integrations/chart/chart-options.ts";
import type { ScrubListener, ScrubPoint } from "../integrations/chart/use-chart-scrub.ts";
import { usePriceChart } from "../integrations/chart/use-price-chart.ts";
import { formatScrubTime } from "./scrub-time.ts";

function chartFormatters(locale: string): ChartFormatters {
  return {
    time: (epochMs) => formatMarketDateTime(epochMs, { locale }),
    tick: (epochMs, kind) =>
      kind === "time"
        ? formatMarketTime(epochMs, { locale, label: false })
        : formatMarketDate(epochMs, { locale, includeYear: kind === "year" }),
  };
}

export interface ConnectedPriceChartProps {
  symbol: string;
  range: Range;
  scrub: ScrubPoint | undefined;
  onScrub: ScrubListener;
}

function chartStateOf(history: LiveHistoryResult): ChartState {
  if (history.previousClose !== undefined) return "ready";
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

export function ConnectedPriceChart({ symbol, range, scrub, onScrub }: ConnectedPriceChartProps) {
  const t = useT();
  const locale = useLocale();
  const history = useLiveHistory(symbol, range);
  const direction =
    history.rangeChange === undefined ? "flat" : directionOf(history.rangeChange.change);
  const previousClose = range === "1D" ? history.previousClose : undefined;
  const chart = usePriceChart({
    datasetKey: `${symbol}:${range}`,
    bars: history.bars,
    range,
    session: history.session,
    previousClose,
    direction,
    muted: history.ageMs !== undefined,
    formatters: chartFormatters(locale),
    onScrub,
  });
  return (
    <PriceChart
      state={chartStateOf(history)}
      direction={direction}
      drawn={chart.drawn}
      label={t("detail.chart.label", { range: t(`detail.range.${range}`) })}
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
      readout={readoutOf(range, history.baseline, scrub, locale)}
      onRetry={() => void history.refetch()}
      onKeyDown={chart.scrub.onKeyDown}
      onBlur={chart.scrub.onBlur}
      containerRef={chart.containerRef}
      livePointRef={chart.overlays.livePoint}
      plotRef={chart.overlays.plot}
    />
  );
}

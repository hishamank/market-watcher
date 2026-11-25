"use client";

import type { Range } from "@mini/contracts";
import {
  directionOf,
  formatMarketDate,
  formatMarketDateTime,
  formatMarketTime,
  formatPrice,
  useLiveHistory,
  useT,
} from "@mini/core";
import { PriceChart, type ChartState } from "../components/price-chart.tsx";
import type { ChartFormatters } from "../integrations/chart/chart-options.ts";
import { usePriceChart } from "../integrations/chart/use-price-chart.ts";

const formatters: ChartFormatters = {
  time: (epochMs) => formatMarketDateTime(epochMs),
  tick: (epochMs, kind) =>
    kind === "time"
      ? formatMarketTime(epochMs, { label: false })
      : formatMarketDate(epochMs, { includeYear: kind === "year" }),
};

const states: Record<"pending" | "success" | "error", ChartState> = {
  pending: "loading",
  success: "ready",
  error: "error",
};

export function ConnectedPriceChart({ symbol, range }: { symbol: string; range: Range }) {
  const t = useT();
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
    formatters,
  });
  return (
    <PriceChart
      state={states[history.status]}
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
      containerRef={chart.containerRef}
      livePointRef={chart.overlays.livePoint}
      previousCloseRef={chart.overlays.previousClose}
    />
  );
}

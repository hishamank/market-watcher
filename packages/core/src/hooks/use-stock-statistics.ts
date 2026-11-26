"use client";

import { useQuery } from "@tanstack/react-query";
import {
  formatCompactAmount,
  positionInRange,
  ratioToPercent,
  roundPercent,
} from "@mini/contracts";
import { useCore } from "../core-provider.tsx";
import { formatPrice } from "../format/money-format.ts";
import { formatMarketDateTime } from "../format/time-format.ts";
import { statisticsQueryOptions } from "../rest/statistics-query.ts";
import { useQuote } from "./use-quote.ts";
import { useT, useLocale } from "./use-t.ts";

export function useStockStatistics(symbol: string) {
  const { fetchStatistics } = useCore();
  const query = useQuery(statisticsQueryOptions(fetchStatistics, symbol));
  const quote = useQuote(symbol);
  const t = useT();
  const locale = useLocale();
  const retry = () => {
    void query.refetch();
  };
  if (!query.data) return { status: query.isError ? "error" : "loading", retry } as const;
  const { statistics, source, fetchedAt } = query.data;
  if (
    !statistics ||
    !Object.entries(statistics).some(([key, value]) => key !== "currency" && value !== null)
  )
    return { status: "empty" } as const;
  const stats = statistics;
  const values = {
    marketCap: stats.marketCap === null ? "—" : `$${formatCompactAmount(stats.marketCap)}`,
    trailingPE: stats.trailingPE === null ? "—" : `${roundPercent(stats.trailingPE)}×`,
    trailingEps: stats.trailingEps === null ? "—" : formatPrice(stats.trailingEps),
    dividendYield: stats.dividendYield === null ? "—" : `${ratioToPercent(stats.dividendYield)}%`,
    averageVolume:
      stats.averageVolume === null ? "—" : formatCompactAmount(String(stats.averageVolume)),
    yearRange: stats.yearRange
      ? `${formatPrice(stats.yearRange.low)} – ${formatPrice(stats.yearRange.high)}`
      : "—",
  };
  const labels = [
    "marketCap",
    "trailingPE",
    "trailingEps",
    "dividendYield",
    "averageVolume",
    "yearRange",
  ] as const;
  const facts = labels.map((id) => ({
    id,
    label: t(`statistics.${id}`),
    value: values[id],
  }));
  return {
    status: "ready",
    facts,
    range: stats.yearRange
      ? {
          low: formatPrice(stats.yearRange.low),
          high: formatPrice(stats.yearRange.high),
          position: quote ? positionInRange(stats.yearRange, quote.price) : null,
          priceLabel: quote ? t("statistics.lastPrice", { price: formatPrice(quote.price) }) : null,
        }
      : null,
    attribution: t(source === "simulated" ? "statistics.sample" : "profile.source"),
    retrieved:
      source === "simulated"
        ? null
        : t("profile.retrieved", { time: formatMarketDateTime(fetchedAt, { locale }) }),
  } as const;
}

export type StockStatisticsView = ReturnType<typeof useStockStatistics>;

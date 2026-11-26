"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const [helpId, setHelpId] = useState<string | null>(null);
  const retry = () => {
    void query.refetch();
  };
  if (!query.data) return { status: query.isError ? "error" : "loading", retry } as const;
  const { statistics, source, fetchedAt } = query.data;
  if (!statistics) return { status: "empty" } as const;
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
    help: t(`statistics.${id}Help`),
    value: values[id],
    expanded: helpId === id,
    toggleHelp: () => setHelpId(helpId === id ? null : id),
  }));
  const selected = facts.find((fact) => fact.expanded);
  return {
    status: "ready",
    facts,
    help: selected ? { title: selected.label, text: selected.help } : null,
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

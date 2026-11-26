"use client";

import { useQuery } from "@tanstack/react-query";
import { earningsBarGeometry, formatEarningsPerShare } from "@mini/contracts";
import { useCore } from "../core-provider.tsx";
import { MINUS_SIGN } from "../format/constants.ts";
import { formatMarketDate, formatMarketDateTime } from "../format/time-format.ts";
import { earningsQueryOptions } from "../rest/earnings-query.ts";
import { useLocale, useT } from "./use-t.ts";

export function useStockEarnings(symbol: string) {
  const { fetchEarnings } = useCore();
  const query = useQuery(earningsQueryOptions(fetchEarnings, symbol));
  const t = useT();
  const locale = useLocale();
  const retry = () => {
    void query.refetch();
  };
  if (!query.data) return { status: query.isError ? "error" : "loading", retry } as const;
  const { earnings, source, fetchedAt } = query.data;
  if (!earnings || (!earnings.nextReport && earnings.quarters.length === 0))
    return { status: "empty" } as const;
  const eps = (value: string | null) =>
    value === null ? "—" : formatEarningsPerShare(value).replace("-", MINUS_SIGN);
  const label = (quarter: number, year: number) => t("earnings.quarter", { quarter, year });
  const geometry = earningsBarGeometry(earnings.quarters);
  const latest = earnings.quarters.findLast((quarter) => quarter.actual !== null);
  return {
    status: "ready",
    next: earnings.nextReport
      ? {
          date: earnings.nextReport.dates
            .map((date) => formatMarketDate(date, { locale, includeYear: true }))
            .join(" – "),
          confidence: t(
            earnings.nextReport.confidence === "unknown"
              ? "earnings.dateUnknown"
              : `earnings.${earnings.nextReport.confidence}`,
          ),
        }
      : null,
    latest: latest
      ? {
          quarter: label(latest.fiscalQuarter, latest.fiscalYear),
          actual: eps(latest.actual),
          estimate: eps(latest.estimate),
        }
      : null,
    zero: geometry.zero,
    quarters: earnings.quarters.map((quarter, index) => ({
      id: `${quarter.fiscalYear}-${quarter.fiscalQuarter}`,
      label: label(quarter.fiscalQuarter, quarter.fiscalYear),
      actual: eps(quarter.actual),
      estimate: eps(quarter.estimate),
      actualBar: geometry.bars[index]?.actual ?? null,
      estimateBar: geometry.bars[index]?.estimate ?? null,
    })),
    basis: earnings.quarters.length ? t(`earnings.${earnings.basis}`) : null,
    attribution: t(source === "simulated" ? "earnings.sample" : "profile.source"),
    retrieved:
      source === "simulated"
        ? null
        : t("profile.retrieved", { time: formatMarketDateTime(fetchedAt, { locale }) }),
  } as const;
}

export type StockEarningsView = ReturnType<typeof useStockEarnings>;

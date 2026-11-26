import YahooFinance from "yahoo-finance2";
import { StockStatisticsSchema, YearRangeSchema, type StockStatistics } from "@mini/contracts";
import type { StatisticsSource } from "./source.ts";

function decimal(value: number | undefined, signed = false): string | null {
  if (value === undefined || !Number.isFinite(value) || (!signed && value < 0)) return null;
  return value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 });
}

export function createYahooStatisticsSource(): StatisticsSource {
  const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  return {
    async load(symbol, signal): Promise<StockStatistics | null> {
      const result = await yahoo.quoteSummary(
        symbol.replaceAll(".", "-"),
        { modules: ["summaryDetail", "defaultKeyStatistics", "quoteType"] },
        { fetchOptions: { signal } },
      );
      const detail = result.summaryDetail;
      if (!detail || detail.currency !== "USD") return null;
      const company = result.quoteType?.quoteType === "EQUITY";
      const range = YearRangeSchema.safeParse({
        low: decimal(detail.fiftyTwoWeekLow),
        high: decimal(detail.fiftyTwoWeekHigh),
      });
      const statistics = StockStatisticsSchema.parse({
        currency: "USD",
        marketCap: company ? decimal(detail.marketCap) : null,
        trailingPE:
          company && detail.trailingPE && detail.trailingPE > 0 ? decimal(detail.trailingPE) : null,
        trailingEps: company ? decimal(result.defaultKeyStatistics?.trailingEps, true) : null,
        dividendYield: decimal(detail.dividendYield),
        averageVolume:
          Number.isSafeInteger(detail.averageVolume) && (detail.averageVolume ?? -1) >= 0
            ? detail.averageVolume
            : null,
        yearRange: range.success ? range.data : null,
      });
      return Object.entries(statistics).some(([key, value]) => key !== "currency" && value !== null)
        ? statistics
        : null;
    },
  };
}

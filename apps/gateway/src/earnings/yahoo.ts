import YahooFinance from "yahoo-finance2";
import { EarningsQuarterSchema, StockEarningsSchema } from "@mini/contracts";
import type { EarningsSource } from "./source.ts";

function decimal(value: number | undefined): string | null {
  return value !== undefined && Number.isFinite(value)
    ? value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })
    : null;
}

export function createYahooEarningsSource(now = () => Date.now()): EarningsSource {
  const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  return {
    async load(symbol, signal) {
      const ticker = symbol.replaceAll(".", "-");
      const type = await yahoo.quoteSummary(
        ticker,
        { modules: ["quoteType"] },
        { fetchOptions: { signal } },
      );
      if (type.quoteType?.quoteType !== "EQUITY") return null;
      const result = await yahoo.quoteSummary(
        ticker,
        { modules: ["calendarEvents", "earnings"] },
        { fetchOptions: { signal } },
      );
      const data = result.earnings;
      const currency = data?.financialCurrency === "USD" ? "USD" : null;
      const quarters = currency
        ? (data?.earningsChart.quarterly ?? [])
            .flatMap((row) => {
              const fiscal = /^([1-4])Q(\d{4})$/.exec(row.fiscalQuarter);
              const parsed = EarningsQuarterSchema.safeParse({
                fiscalQuarter: Number(fiscal?.[1]),
                fiscalYear: Number(fiscal?.[2]),
                periodEnd: row.periodEndDate.getTime(),
                actual: decimal(row.actual),
                estimate: decimal(row.estimate),
              });
              return parsed.success ? [parsed.data] : [];
            })
            .sort((a, b) => a.periodEnd - b.periodEnd)
            .slice(-4)
        : [];
      const calendar = result.calendarEvents?.earnings;
      const dates = [...new Set((calendar?.earningsDate ?? []).map((date) => date.getTime()))]
        .filter((date) => Number.isFinite(date) && date >= now())
        .sort((a, b) => a - b)
        .slice(0, 2);
      if (quarters.length === 0 && dates.length === 0) return null;
      return StockEarningsSchema.parse({
        currency,
        quarters,
        basis: data?.defaultMethodology ?? "unknown",
        nextReport: dates.length
          ? {
              dates,
              confidence:
                calendar?.isEarningsDateEstimate === true
                  ? "estimated"
                  : calendar?.isEarningsDateEstimate === false
                    ? "scheduled"
                    : "unknown",
            }
          : null,
      });
    },
  };
}

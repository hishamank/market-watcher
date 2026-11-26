import YahooFinance from "yahoo-finance2";
import { CompanyProfileSchema } from "@mini/contracts";
import type { ProfileSource } from "./source.ts";

function text(value: string | undefined): string | null {
  return value?.trim() || null;
}

function website(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    return { url: url.href, label: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

const exchangeNames: Readonly<Record<string, string>> = {
  NMS: "Nasdaq Global Select",
  NGM: "Nasdaq Global Market",
  NCM: "Nasdaq Capital Market",
  NYQ: "NYSE",
  PCX: "NYSE Arca",
  BTS: "Cboe BZX",
};

export function createYahooProfileSource(): ProfileSource {
  const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  return {
    async load(symbol, signal) {
      const result = await yahoo.quoteSummary(
        symbol.replaceAll(".", "-"),
        { modules: ["summaryProfile", "quoteType"] },
        { fetchOptions: { signal } },
      );
      const profile = result.summaryProfile;
      if (!profile) return null;
      const kind = result.quoteType?.quoteType === "ETF" ? "fund" : "company";
      return CompanyProfileSchema.parse({
        kind,
        description: text(profile.longBusinessSummary),
        sector: kind === "company" ? text(profile.sector) : null,
        industry: kind === "company" ? text(profile.industry) : null,
        exchange:
          exchangeNames[result.quoteType?.exchange ?? ""] ?? text(result.quoteType?.exchange),
        website: website(profile.website),
      });
    },
  };
}

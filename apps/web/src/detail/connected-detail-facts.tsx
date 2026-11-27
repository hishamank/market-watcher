"use client";

import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  formatMarketTime,
  useLocale,
  useQuote,
  useQuoteWarning,
} from "@mini/core";
import { DetailFacts } from "../components/detail-facts.tsx";

export function ConnectedDetailFacts({ stock }: { stock: Stock }) {
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const warning = useQuoteWarning(quote);
  const locale = useLocale();
  return (
    <DetailFacts
      previousClose={quote.previousClose}
      dayRange={quote.dayRange}
      lastUpdate={
        quote.lastKnown || warning.degraded
          ? formatMarketDateTime(quote.timestamp, { locale })
          : formatMarketTime(quote.timestamp, { locale })
      }
    />
  );
}

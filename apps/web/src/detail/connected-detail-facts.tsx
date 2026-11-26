"use client";

import type { Stock } from "@mini/contracts";
import { formatMarketDateTime, formatMarketTime, useLocale, useQuote } from "@mini/core";
import { DetailFacts } from "../components/detail-facts.tsx";

export function ConnectedDetailFacts({ stock }: { stock: Stock }) {
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const locale = useLocale();
  return (
    <DetailFacts
      previousClose={quote.previousClose}
      dayRange={quote.dayRange}
      lastUpdate={
        quote.lastKnown
          ? formatMarketDateTime(quote.timestamp, { locale })
          : formatMarketTime(quote.timestamp, { locale })
      }
    />
  );
}

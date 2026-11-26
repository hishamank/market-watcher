"use client";

import type { Stock } from "@mini/contracts";
import { formatMarketDateTime, formatMarketTime, useQuote } from "@mini/core";
import { DetailFacts } from "../components/detail-facts.tsx";

export function ConnectedDetailFacts({ stock }: { stock: Stock }) {
  const quote = useQuote(stock.symbol) ?? stock.quote;
  return (
    <DetailFacts
      previousClose={quote.previousClose}
      lastUpdate={
        quote.lastKnown ? formatMarketDateTime(quote.timestamp) : formatMarketTime(quote.timestamp)
      }
    />
  );
}

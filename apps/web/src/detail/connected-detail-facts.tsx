"use client";

import type { Stock } from "@mini/contracts";
import { formatMarketTime, useQuote } from "@mini/core";
import { DetailFacts } from "../components/detail-facts.tsx";

export function ConnectedDetailFacts({ stock }: { stock: Stock }) {
  const quote = useQuote(stock.symbol) ?? stock.quote;
  return (
    <DetailFacts
      previousClose={quote.previousClose}
      lastUpdate={formatMarketTime(quote.timestamp)}
    />
  );
}

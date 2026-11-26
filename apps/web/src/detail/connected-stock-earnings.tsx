"use client";

import { useStockEarnings } from "@mini/core";
import { StockEarnings } from "../components/stock-earnings.tsx";

export function ConnectedStockEarnings({ symbol }: { symbol: string }) {
  const view = useStockEarnings(symbol);
  return <StockEarnings view={view} />;
}

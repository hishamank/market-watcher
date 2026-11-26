"use client";

import { useStockNews } from "@mini/core";
import { StockNews } from "../components/stock-news.tsx";

export function ConnectedStockNews({ symbol }: { symbol: string }) {
  const view = useStockNews(symbol);
  return <StockNews view={view} />;
}

"use client";

import type { Stock } from "@mini/contracts";
import { useState } from "react";
import { useCore } from "../core-provider.tsx";
import { sortStocks, type StockSort } from "../watchlist/stock-sort.ts";
import { useLocale } from "./use-t.ts";

interface SortSnapshot {
  readonly key: string;
  readonly order: readonly string[];
}

function keepOrder(
  order: readonly string[],
  stocks: readonly Stock[],
): readonly Stock[] | undefined {
  const position = new Map(order.map((symbol, index) => [symbol, index]));
  if (stocks.some((stock) => !position.has(stock.symbol))) return undefined;
  return [...stocks].sort(
    (first, second) => (position.get(first.symbol) ?? 0) - (position.get(second.symbol) ?? 0),
  );
}

export function useSortedStocks(
  stocks: readonly Stock[],
  sort: StockSort | undefined,
): readonly Stock[] {
  const { quoteStore } = useCore();
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState<SortSnapshot | undefined>(undefined);
  if (sort === undefined) return stocks;
  const key = `${sort.field}:${sort.direction}:${locale}`;
  const kept = snapshot?.key === key ? keepOrder(snapshot.order, stocks) : undefined;
  if (kept !== undefined) return kept;
  const sorted = sortStocks(
    stocks,
    sort,
    (stock) => quoteStore.getQuote(stock.symbol) ?? stock.quote,
    locale,
  );
  setSnapshot({ key, order: sorted.map((stock) => stock.symbol) });
  return sorted;
}

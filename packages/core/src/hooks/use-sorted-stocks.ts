"use client";

import type { Stock } from "@mini/contracts";
import { useState } from "react";
import { useCore } from "../core-provider.tsx";
import {
  holdSortOrder,
  sortStocks,
  type SortSnapshot,
  type StockSort,
} from "../watchlist/stock-sort.ts";
import { useLocale } from "./use-t.ts";

export function useSortedStocks(
  stocks: readonly Stock[] | undefined,
  sort: StockSort | undefined,
): readonly Stock[] {
  const { quoteStore } = useCore();
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState<SortSnapshot | undefined>(undefined);
  const key = sort === undefined ? undefined : `${sort.field}:${sort.direction}:${locale}`;
  const held = holdSortOrder(snapshot, key, stocks, () =>
    sort === undefined || stocks === undefined
      ? (stocks ?? [])
      : sortStocks(
          stocks,
          sort,
          (stock) => quoteStore.getQuote(stock.symbol) ?? stock.quote,
          locale,
        ),
  );
  if (held.snapshot !== snapshot) setSnapshot(held.snapshot);
  return held.stocks;
}

"use client";

import type { Stock } from "@mini/contracts";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useReducer } from "react";
import { useCore } from "../core-provider.tsx";
import { stocksBySymbolsQueryOptions } from "../rest/stock-queries.ts";
import { inspectStockCache, planWatchlistBatches } from "../watchlist/watchlist-batches.ts";
import { useStockList } from "./use-stocks.ts";
import { useWatchlist } from "./use-watchlist.ts";

export interface WatchlistStockRow {
  readonly symbol: string;
  readonly stock: Stock | undefined;
  readonly loading: boolean;
  readonly retry: () => void;
}

export type WatchlistStocksResult = { readonly rows: readonly WatchlistStockRow[] } & (
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "ready"; readonly stocks: readonly Stock[] }
);

export function useWatchlistStocks(): WatchlistStocksResult {
  const { restClient, quoteStore } = useCore();
  const { symbols, isLoaded } = useWatchlist();
  const client = useQueryClient();
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const list = useStockList();
  const listWaiting = list.isPending && list.failureCount === 0;
  const cache = inspectStockCache(client);
  const listSymbols = new Set(list.data?.stocks.map((stock) => stock.symbol) ?? []);
  const batches = isLoaded && !listWaiting ? planWatchlistBatches(symbols, listSymbols, cache) : [];
  const queries = useQueries({
    queries: batches.map((batch) => stocksBySymbolsQueryOptions(restClient, batch, quoteStore)),
  });
  const stocks = new Map(cache.bySymbol);
  for (const stock of list.data?.stocks ?? []) stocks.set(stock.symbol, stock);
  for (const query of queries) {
    for (const stock of query.data?.stocks ?? []) stocks.set(stock.symbol, stock);
  }
  const rows = symbols.map((symbol) => {
    const query = queries[batches.findIndex((batch) => batch.includes(symbol))];
    return {
      symbol,
      stock: stocks.get(symbol),
      loading: query === undefined ? listWaiting : query.isPending || query.isFetching,
      retry: () => {
        if (query !== undefined) void query.refetch();
        else
          void client
            .invalidateQueries({
              queryKey: ["stocks", "symbols"],
              predicate: ({ queryKey }) =>
                Array.isArray(queryKey[2]) && queryKey[2].includes(symbol),
            })
            .then(refresh);
      },
    };
  });
  if (!isLoaded) return { status: "loading", rows };
  if (rows.length === 0) return { status: "empty", rows };
  if (listWaiting) return { status: "loading", rows };
  const covering = queries.filter((_, index) =>
    batches[index]?.some((symbol) => symbols.includes(symbol) && !stocks.has(symbol)),
  );
  if (covering.some((query) => query.isPending)) return { status: "loading", rows };
  const failed = covering.filter((query) => query.isError);
  if (failed.length > 0) {
    return {
      status: "error",
      rows,
      retry: () => {
        for (const query of failed) void query.refetch();
      },
    };
  }
  const ordered = rows.flatMap(({ stock }) => (stock === undefined ? [] : [stock]));
  return ordered.length === 0
    ? { status: "empty", rows }
    : { status: "ready", stocks: ordered, rows };
}

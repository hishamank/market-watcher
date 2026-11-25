"use client";

import { MAX_STOCKS_QUERY_SYMBOLS, type Stock } from "@mini/contracts";
import {
  createRestClient,
  stockQueryKeys,
  stocksBySymbolsQueryOptions,
  useStockList,
  useStocks,
} from "@mini/core";
import { useQueries, useQueryClient, type QueryClient } from "@tanstack/react-query";

const restClient = createRestClient({
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000",
});

const defaultStaleTime = stocksBySymbolsQueryOptions(restClient, []).staleTime;
export const WATCHLIST_STOCK_FRESH_MS =
  typeof defaultStaleTime === "number" ? defaultStaleTime : 60_000;

export type WatchlistStocksState =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly retry: () => void }
  | { readonly status: "ready"; readonly stocks: readonly Stock[] };

export interface StockCacheCoverage {
  readonly bySymbol: Map<string, Stock>;
  readonly freshCovered: Set<string>;
  readonly fetchingBatches: string[][];
}

function chunkSymbols(
  symbols: readonly string[],
  maxChunkSize = MAX_STOCKS_QUERY_SYMBOLS,
): string[][] {
  const sorted = [...new Set(symbols)].sort();
  const chunks: string[][] = [];
  for (let index = 0; index < sorted.length; index += maxChunkSize) {
    chunks.push(sorted.slice(index, index + maxChunkSize));
  }
  return chunks;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function inspectStockCache(
  queryClient: QueryClient,
  freshMs = WATCHLIST_STOCK_FRESH_MS,
): StockCacheCoverage {
  const bySymbol = new Map<string, Stock>();
  const freshCovered = new Set<string>();
  const fetchingBatches: string[][] = [];
  for (const query of queryClient.getQueryCache().findAll({ queryKey: stockQueryKeys.all })) {
    const queryKey = query.queryKey;
    const data = query.state.data;
    const isFresh = data !== undefined && !query.isStaleByTime(freshMs);
    if (
      queryKey[1] === "symbols" &&
      query.state.fetchStatus === "fetching" &&
      isStringArray(queryKey[2]) &&
      queryKey[2].length > 0
    ) {
      fetchingBatches.push([...queryKey[2]]);
    }
    if (data === undefined || data === null || typeof data !== "object") continue;
    if (
      (queryKey[1] === "list" || queryKey[1] === "symbols") &&
      "stocks" in data &&
      Array.isArray(data.stocks)
    ) {
      for (const stock of data.stocks as readonly Stock[]) {
        bySymbol.set(stock.symbol, stock);
        if (isFresh) freshCovered.add(stock.symbol);
      }
      if (isFresh && queryKey[1] === "symbols" && isStringArray(queryKey[2])) {
        for (const symbol of queryKey[2]) freshCovered.add(symbol);
      }
    } else if (queryKey[1] === "detail" && "stock" in data) {
      const stock = (data as { stock: Stock }).stock;
      bySymbol.set(stock.symbol, stock);
      if (isFresh) freshCovered.add(stock.symbol);
    }
  }
  return { bySymbol, freshCovered, fetchingBatches };
}

export function planWatchlistBatches(
  symbols: readonly string[],
  listSymbols: ReadonlySet<string>,
  cache: StockCacheCoverage,
  maxChunkSize = MAX_STOCKS_QUERY_SYMBOLS,
): string[][] {
  const needed = symbols.filter(
    (symbol) => !listSymbols.has(symbol) && !cache.freshCovered.has(symbol),
  );
  if (needed.length === 0) return [];
  const neededSet = new Set(needed);
  const coveredByFlight = new Set<string>();
  const keptBatches: string[][] = [];
  for (const batch of cache.fetchingBatches) {
    if (!batch.some((symbol) => neededSet.has(symbol) && !coveredByFlight.has(symbol))) continue;
    keptBatches.push(batch);
    for (const symbol of batch) coveredByFlight.add(symbol);
  }
  const uncovered = needed.filter((symbol) => !coveredByFlight.has(symbol));
  return [...keptBatches, ...chunkSymbols(uncovered, maxChunkSize)];
}

function resolveOrderedStocks(
  symbols: readonly string[],
  bySymbol: ReadonlyMap<string, Stock>,
): { stocks: Stock[]; hasUnresolved: boolean } {
  const stocks: Stock[] = [];
  let hasUnresolved = false;
  for (const symbol of symbols) {
    const stock = bySymbol.get(symbol);
    if (stock !== undefined) {
      stocks.push(stock);
    } else {
      hasUnresolved = true;
    }
  }
  return { stocks, hasUnresolved };
}

export function useWatchlistStocks(
  symbols: readonly string[],
  isLoaded: boolean,
): WatchlistStocksState {
  const queryClient = useQueryClient();
  const list = useStockList();
  const listSymbols = new Set(list.data?.stocks.map((stock) => stock.symbol) ?? []);
  const cache = inspectStockCache(queryClient);
  const chunks =
    isLoaded && list.data !== undefined ? planWatchlistBatches(symbols, listSymbols, cache) : [];
  const firstChunk = chunks[0] ?? [];
  const overflowChunks = chunks.slice(1);
  const firstQuery = useStocks(firstChunk);
  const overflowQueries = useQueries({
    queries: overflowChunks.map((chunk) => stocksBySymbolsQueryOptions(restClient, chunk)),
  });
  const extraQueries = firstChunk.length > 0 ? [firstQuery, ...overflowQueries] : [];

  if (!isLoaded) return { status: "loading" };
  if (symbols.length === 0) return { status: "empty" };
  if (list.data === undefined) {
    return list.isError
      ? { status: "error", retry: () => void list.refetch() }
      : { status: "loading" };
  }

  const bySymbol = new Map(cache.bySymbol);
  for (const stock of list.data.stocks) bySymbol.set(stock.symbol, stock);
  for (const query of extraQueries) {
    for (const stock of query.data?.stocks ?? []) bySymbol.set(stock.symbol, stock);
  }

  const { stocks, hasUnresolved } = resolveOrderedStocks(symbols, bySymbol);
  if (hasUnresolved) {
    if (extraQueries.some((query) => query.isPending)) return { status: "loading" };
    if (extraQueries.some((query) => query.isError)) {
      return {
        status: "error",
        retry: () => {
          for (const query of extraQueries) {
            if (query.isError) void query.refetch();
          }
        },
      };
    }
  }
  return stocks.length === 0 ? { status: "empty" } : { status: "ready", stocks };
}

import { MAX_STOCKS_QUERY_SYMBOLS, type Stock } from "@mini/contracts";
import type { QueryClient } from "@tanstack/react-query";
import { normaliseSymbols, STOCK_STALE_MS, stockQueryKeys } from "../rest/stock-queries.ts";

interface StockCacheCoverage {
  readonly bySymbol: Map<string, Stock>;
  readonly freshCovered: Set<string>;
  readonly fetchingBatches: string[][];
}

function chunkSymbols(
  symbols: readonly string[],
  maxChunkSize = MAX_STOCKS_QUERY_SYMBOLS,
): string[][] {
  const sorted = normaliseSymbols(symbols);
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
  freshMs = STOCK_STALE_MS,
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

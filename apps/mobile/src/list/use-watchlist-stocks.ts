import { createRestClient, stocksBySymbolsQueryOptions, useStockList, useStocks } from "@mini/core";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useReducer } from "react";
import { gatewayUrl } from "../config/gateway-url.ts";
import { inspectStockCache, planWatchlistBatches } from "./watchlist-cache.ts";

const rest = createRestClient({ gatewayUrl });

export function useWatchlistStocks(symbols: readonly string[], isLoaded: boolean) {
  const client = useQueryClient();
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const list = useStockList();
  const cache = inspectStockCache(client);
  const listSymbols = new Set(list.data?.stocks.map((stock) => stock.symbol) ?? []);
  const batches = isLoaded ? planWatchlistBatches(symbols, listSymbols, cache) : [];
  const first = useStocks(batches[0] ?? []);
  const overflow = useQueries({
    queries: batches.slice(1).map((batch) => stocksBySymbolsQueryOptions(rest, batch)),
  });
  const queries = batches.length > 0 ? [first, ...overflow] : [];
  const stocks = new Map(cache.bySymbol);
  for (const stock of list.data?.stocks ?? []) stocks.set(stock.symbol, stock);
  for (const query of queries) {
    for (const stock of query.data?.stocks ?? []) stocks.set(stock.symbol, stock);
  }
  return symbols.map((symbol) => {
    const query = queries[batches.findIndex((batch) => batch.includes(symbol))];
    return {
      symbol,
      stock: stocks.get(symbol),
      loading: query?.isPending ?? false,
      retry: () => {
        if (query !== undefined) void query.refetch();
        else void client.invalidateQueries({ queryKey: ["stocks", "symbols"] }).then(refresh);
      },
    };
  });
}

import type { HistoryResponse, Quote, Range, Stock } from "@mini/contracts";
import { isServer, queryOptions } from "@tanstack/react-query";
import type { QuoteStore } from "../realtime/quote-store.ts";
import { type RestClient, RestClientError } from "./rest-client.ts";

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const MAX_RETRIES = 3;

export const STOCK_STALE_MS = MINUTE_MS;

export const HISTORY_STALE_MS: Readonly<Record<Range, number>> = {
  "1D": MINUTE_MS,
  "1W": 5 * MINUTE_MS,
  "1M": 60 * MINUTE_MS,
  "3M": 60 * MINUTE_MS,
  "1Y": 60 * MINUTE_MS,
  "5Y": 60 * MINUTE_MS,
};

export const stockQueryKeys = {
  all: ["stocks"] as const,
  list: () => ["stocks", "list"] as const,
  symbols: (symbols: readonly string[]) =>
    ["stocks", "symbols", normaliseSymbols(symbols)] as const,
  detail: (symbol: string) => ["stocks", "detail", symbol] as const,
  allHistory: ["stocks", "history"] as const,
  history: (symbol: string, range: Range) => ["stocks", "history", symbol, range] as const,
};

const FINAL_CODES = new Set(["not_found", "invalid_request", "origin_not_allowed"]);

export function shouldRetryRestError(failureCount: number, error: Error): boolean {
  if (isServer || failureCount >= MAX_RETRIES) return false;
  return !(error instanceof RestClientError && FINAL_CODES.has(error.code));
}

export function normaliseSymbols(symbols: readonly string[]): string[] {
  return [...new Set(symbols)].sort();
}

function seedFrom<T>(data: T, quotes: readonly Quote[], quoteStore?: QuoteStore): T {
  quoteStore?.upsertMany(quotes);
  return data;
}

const quotesOf = (stocks: readonly Stock[]) => stocks.map((stock) => stock.quote);

export function stockListQueryOptions(rest: RestClient, quoteStore?: QuoteStore) {
  return queryOptions({
    queryKey: stockQueryKeys.list(),
    queryFn: async ({ signal }) => {
      const data = await rest.listStocks(signal);
      return seedFrom(data, quotesOf(data.stocks), quoteStore);
    },
    staleTime: STOCK_STALE_MS,
    retry: shouldRetryRestError,
  });
}

export function stocksBySymbolsQueryOptions(
  rest: RestClient,
  symbols: readonly string[],
  quoteStore?: QuoteStore,
) {
  const requested = normaliseSymbols(symbols);
  return queryOptions({
    queryKey: stockQueryKeys.symbols(requested),
    queryFn: async ({ signal }) => {
      const data = await rest.getStocks(requested, signal);
      return seedFrom(data, quotesOf(data.stocks), quoteStore);
    },
    enabled: requested.length > 0,
    staleTime: STOCK_STALE_MS,
    retry: shouldRetryRestError,
  });
}

export function stockQueryOptions(rest: RestClient, symbol: string, quoteStore?: QuoteStore) {
  return queryOptions({
    queryKey: stockQueryKeys.detail(symbol),
    queryFn: async ({ signal }) => {
      const data = await rest.getStock(symbol, signal);
      return seedFrom(data, [data.stock.quote], quoteStore);
    },
    staleTime: STOCK_STALE_MS,
    retry: shouldRetryRestError,
  });
}

export function historyRefetchMs(
  range: Range,
  data: HistoryResponse | undefined,
  now: number,
): number {
  const interval = HISTORY_STALE_MS[range];
  if (data?.range !== "1D") return interval;
  const untilClose = data.session.close - now;
  return untilClose > 0 ? Math.min(interval, untilClose) : interval;
}

export function historyQueryOptions(rest: RestClient, symbol: string, range: Range) {
  return queryOptions({
    queryKey: stockQueryKeys.history(symbol, range),
    queryFn: ({ signal }) => rest.getHistory(symbol, range, signal),
    staleTime: HISTORY_STALE_MS[range],
    refetchInterval: (query) => historyRefetchMs(range, query.state.data, Date.now()),
    retry: shouldRetryRestError,
  });
}

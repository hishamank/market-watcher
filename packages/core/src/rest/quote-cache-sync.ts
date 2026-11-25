import type { Quote, StockDetailResponse, StockListResponse } from "@mini/contracts";
import { notifyManager, type QueryCache, type QueryKey } from "@tanstack/react-query";
import type { QuoteStore } from "../realtime/quote-store.ts";
import { stockQueryKeys } from "./stock-queries.ts";

function quotesIn(queryKey: QueryKey, data: unknown): readonly Quote[] {
  if (data === undefined || queryKey[0] !== stockQueryKeys.all[0]) return [];
  if (queryKey[1] === "list" || queryKey[1] === "symbols") {
    return (data as StockListResponse).stocks.map((stock) => stock.quote);
  }
  if (queryKey[1] === "detail") return [(data as StockDetailResponse).stock.quote];
  return [];
}

function cachedQuotes(cache: QueryCache): readonly Quote[] {
  return cache
    .findAll({ queryKey: stockQueryKeys.all })
    .flatMap((query) => quotesIn(query.queryKey, query.state.data));
}

function newestBySymbol(quotes: readonly Quote[]): readonly Quote[] {
  const newest = new Map<string, Quote>();
  for (const quote of quotes) {
    const current = newest.get(quote.symbol);
    if (current === undefined || quote.timestamp > current.timestamp) {
      newest.set(quote.symbol, quote);
    }
  }
  return Array.from(newest.values());
}

export function findCachedQuote(cache: QueryCache, symbol: string): Quote | undefined {
  return newestBySymbol(cachedQuotes(cache).filter((quote) => quote.symbol === symbol))[0];
}

export function syncQuotesFromQueryCache(cache: QueryCache, quoteStore: QuoteStore): () => void {
  let attached = true;

  function apply(quotes: readonly Quote[]): void {
    if (quotes.length === 0) return;
    quoteStore.seed(quotes);
    notifyManager.schedule(() => {
      if (!attached) return;
      quoteStore.upsertMany(
        quotes.filter((quote) => {
          const current = quoteStore.getQuote(quote.symbol);
          return current === undefined || quote.timestamp > current.timestamp;
        }),
      );
    });
  }

  apply(newestBySymbol(cachedQuotes(cache)));
  const unsubscribe = cache.subscribe((event) => {
    if (event.type === "added" || event.type === "updated") {
      apply(quotesIn(event.query.queryKey, event.query.state.data));
    }
  });
  return () => {
    attached = false;
    unsubscribe();
  };
}

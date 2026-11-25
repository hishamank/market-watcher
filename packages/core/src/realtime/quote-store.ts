import type { Quote } from "@mini/contracts";

export type QuoteListener = () => void;

export interface QuoteStore {
  getQuote(symbol: string): Quote | undefined;
  subscribe(symbol: string, listener: QuoteListener): () => void;
  upsert(quote: Quote): boolean;
  upsertMany(quotes: readonly Quote[]): void;
}

export function createQuoteStore(): QuoteStore {
  const quotes = new Map<string, Quote>();
  const listenersBySymbol = new Map<string, Set<QuoteListener>>();

  function notify(symbol: string): void {
    const listeners = listenersBySymbol.get(symbol);
    if (listeners === undefined) {
      return;
    }
    for (const listener of Array.from(listeners)) {
      listener();
    }
  }

  function upsert(quote: Quote): boolean {
    const current = quotes.get(quote.symbol);
    if (current !== undefined && quote.timestamp < current.timestamp) {
      return false;
    }
    quotes.set(quote.symbol, quote);
    notify(quote.symbol);
    return true;
  }

  function upsertMany(incoming: readonly Quote[]): void {
    for (const quote of incoming) {
      upsert(quote);
    }
  }

  function getQuote(symbol: string): Quote | undefined {
    return quotes.get(symbol);
  }

  function subscribe(symbol: string, listener: QuoteListener): () => void {
    let listeners = listenersBySymbol.get(symbol);
    if (listeners === undefined) {
      listeners = new Set();
      listenersBySymbol.set(symbol, listeners);
    }
    listeners.add(listener);
    return () => {
      const currentListeners = listenersBySymbol.get(symbol);
      if (currentListeners === undefined) {
        return;
      }
      currentListeners.delete(listener);
      if (currentListeners.size === 0) {
        listenersBySymbol.delete(symbol);
      }
    };
  }

  return { getQuote, subscribe, upsert, upsertMany };
}

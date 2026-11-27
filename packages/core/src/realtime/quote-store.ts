import type { Quote } from "@mini/contracts";

export type QuoteAvailability = "available" | "recovering" | "unavailable";

export type QuoteListener = () => void;

export interface QuoteStore {
  subscribeAvailability(symbol: string, listener: QuoteListener): () => void;
  getAvailability(symbol: string): QuoteAvailability;
  setAvailability(symbol: string, availability: QuoteAvailability): void;
  beginRestRead(): (quotes: readonly Quote[]) => void;
  getQuote(symbol: string): Quote | undefined;
  subscribe(symbol: string, listener: QuoteListener): () => void;
  upsert(quote: Quote): boolean;
  receiveQuotes(quotes: readonly Quote[]): void;
  upsertMany(quotes: readonly Quote[]): void;
  seed(quotes: readonly Quote[]): void;
}

function sameQuote(a: Quote, b: Quote): boolean {
  return (
    a.timestamp === b.timestamp &&
    a.price === b.price &&
    a.change === b.change &&
    a.changePercent === b.changePercent &&
    a.previousClose === b.previousClose &&
    a.lastKnown === b.lastKnown &&
    a.dayRange?.low === b.dayRange?.low &&
    a.dayRange?.high === b.dayRange?.high
  );
}

export function createQuoteStore(): QuoteStore {
  const quotes = new Map<string, Quote>();
  const revisions = new Map<string, number>();
  let revision = 0;
  const availability = new Map<string, QuoteAvailability>();
  const getAvailability = (symbol: string): QuoteAvailability =>
    availability.get(symbol) ?? "available";
  function setAvailability(symbol: string, next: QuoteAvailability): void {
    if (getAvailability(symbol) === next) return;
    availability.set(symbol, next);
    notify(symbol, availabilityListeners);
  }
  const availabilityListeners = new Map<string, Set<QuoteListener>>();
  const listenersBySymbol = new Map<string, Set<QuoteListener>>();

  function notify(symbol: string, source = listenersBySymbol): void {
    const listeners = source.get(symbol);
    if (listeners === undefined) {
      return;
    }
    for (const listener of Array.from(listeners)) {
      listener();
    }
  }

  function applyQuote(quote: Quote, confirmsSubscription: boolean): boolean {
    const current = quotes.get(quote.symbol);
    if (current !== undefined && quote.timestamp < current.timestamp) {
      return false;
    }
    if (current !== undefined && sameQuote(current, quote)) {
      if (confirmsSubscription) setAvailability(quote.symbol, "available");
      return false;
    }
    revisions.set(quote.symbol, ++revision);
    quotes.set(quote.symbol, quote);
    if (confirmsSubscription) setAvailability(quote.symbol, "available");
    notify(quote.symbol);
    return true;
  }

  const upsert = (quote: Quote) => applyQuote(quote, false);
  const receiveQuotes = (incoming: readonly Quote[]) => {
    for (const quote of incoming) applyQuote(quote, true);
  };

  function upsertMany(incoming: readonly Quote[]): void {
    for (const quote of incoming) {
      upsert(quote);
    }
  }

  function seed(incoming: readonly Quote[]): void {
    for (const quote of incoming) {
      const current = quotes.get(quote.symbol);
      const unread = !listenersBySymbol.has(quote.symbol);
      if (unread && (current === undefined || quote.timestamp > current.timestamp)) {
        revisions.set(quote.symbol, ++revision);
        quotes.set(quote.symbol, quote);
      }
    }
  }

  function getQuote(symbol: string): Quote | undefined {
    return quotes.get(symbol);
  }

  function subscribe(
    symbol: string,
    listener: QuoteListener,
    source = listenersBySymbol,
  ): () => void {
    let listeners = source.get(symbol);
    if (listeners === undefined) {
      listeners = new Set();
      source.set(symbol, listeners);
    }
    listeners.add(listener);
    return () => {
      const currentListeners = source.get(symbol);
      if (currentListeners === undefined) {
        return;
      }
      currentListeners.delete(listener);
      if (currentListeners.size === 0) {
        source.delete(symbol);
      }
    };
  }

  function beginRestRead(): (quotes: readonly Quote[]) => void {
    const startedAt = revision;
    return (incoming) => {
      for (const quote of incoming) {
        const current = quotes.get(quote.symbol);
        const superseded = current && (revisions.get(quote.symbol) ?? 0) > startedAt;
        if (superseded && current.timestamp === quote.timestamp) continue;
        upsert(superseded ? { ...quote, lastKnown: current.lastKnown ?? quote.lastKnown } : quote);
      }
    };
  }

  const subscribeAvailability = (symbol: string, listener: QuoteListener) =>
    subscribe(symbol, listener, availabilityListeners);

  return {
    receiveQuotes,
    subscribeAvailability,
    getQuote,
    subscribe,
    upsert,
    upsertMany,
    seed,
    beginRestRead,
    getAvailability,
    setAvailability,
  };
}

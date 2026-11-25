import type { Quote } from "@mini/contracts";
import { buildQuote } from "./quotes.ts";
import type { MarketMoment } from "./snapshots.ts";

export interface StreamTrade {
  readonly price: string;
  readonly time: number;
  readonly session: string;
}

interface Held {
  readonly quote: Quote;
  readonly at: number;
  readonly session: string;
}

export interface HeldQuotes {
  readonly listeners: Set<(quote: Quote) => void>;
  current(symbol: string, session: string): Held | undefined;
  fresh(symbol: string, session: string, since: number): boolean;
  stale(symbol: string, session: string): boolean;
  record(quote: Quote, session: string): void;
  trade(symbol: string, trade: StreamTrade): void;
  forget(symbol: string): void;
}

export function sessionOf({ day, open }: MarketMoment): string {
  return `${day.date} ${open ? "open" : "closed"}`;
}

function sameQuote(a: Quote | undefined, b: Quote): boolean {
  return (
    a !== undefined &&
    a.price === b.price &&
    a.previousClose === b.previousClose &&
    a.timestamp === b.timestamp
  );
}

export function createHeldQuotes(
  now: () => number,
  isSubscribed: (symbol: string) => boolean,
): HeldQuotes {
  const latest = new Map<string, Held>();
  const waiting = new Map<string, StreamTrade>();
  const listeners = new Set<(quote: Quote) => void>();

  const record = (quote: Quote, session: string): void => {
    const changed = !sameQuote(latest.get(quote.symbol)?.quote, quote);
    latest.set(quote.symbol, { quote, at: now(), session });
    if (changed && isSubscribed(quote.symbol)) {
      listeners.forEach((listener) => listener(quote));
    }
  };

  const apply = (symbol: string, trade: StreamTrade): boolean => {
    const held = latest.get(symbol);
    if (held === undefined || held.session !== trade.session) {
      return false;
    }
    const quote = buildQuote(symbol, trade.price, held.quote.previousClose, trade.time);
    if (quote !== undefined && quote.timestamp >= held.quote.timestamp) {
      record(quote, trade.session);
    }
    return true;
  };

  return {
    listeners,
    current: (symbol, session) => {
      const held = latest.get(symbol);
      return held?.session === session ? held : undefined;
    },
    fresh: (symbol, session, since) => {
      const held = latest.get(symbol);
      return held?.session === session && held.at > since;
    },
    stale: (symbol, session) => {
      const held = latest.get(symbol);
      return waiting.has(symbol) || (held !== undefined && held.session !== session);
    },
    record(quote, session) {
      record(quote, session);
      const trade = waiting.get(quote.symbol);
      if (trade !== undefined && apply(quote.symbol, trade)) waiting.delete(quote.symbol);
    },
    trade(symbol, trade) {
      const newest = (waiting.get(symbol)?.time ?? -Infinity) <= trade.time;
      if (!apply(symbol, trade) && newest) waiting.set(symbol, trade);
    },
    forget(symbol) {
      waiting.delete(symbol);
    },
  };
}

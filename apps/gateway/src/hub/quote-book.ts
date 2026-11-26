import type { Quote } from "@mini/contracts";
import type { LiveFeed, MarketCalendar } from "../feeds/types.ts";
import { withLastKnown } from "./last-known.ts";
import { isCurrentQuote, phaseStart } from "./quote-phase.ts";

export type Warn = (detail: object, message: string) => void;

export interface QuoteBook {
  readonly latest: ReadonlyMap<string, Quote>;
  expire(): string[];
  remember(quote: Quote): boolean;
  fetch(symbols: readonly string[]): Promise<Quote[]>;
  refresh(symbols: readonly string[]): Promise<Quote[]>;
  forget(symbols: readonly string[]): void;
  close(): void;
}

function expireBefore(latest: Map<string, Quote>, floor: number): string[] {
  const dropped: string[] = [];
  for (const [symbol, quote] of latest) {
    if (quote.timestamp < floor && !quote.lastKnown) {
      latest.delete(symbol);
      dropped.push(symbol);
    }
  }
  return dropped;
}

export function createQuoteBook(
  live: LiveFeed,
  calendar: MarketCalendar,
  now: () => number,
  isWatched: (symbol: string) => boolean,
  warn: Warn,
): QuoteBook {
  const latest = new Map<string, Quote>();
  const inFlight = new Map<string, Promise<void>>();
  let closed = false;

  function remember(quote: Quote): boolean {
    const current = latest.get(quote.symbol);
    if (
      !isWatched(quote.symbol) ||
      (!quote.lastKnown && !isCurrentQuote(quote, calendar, now())) ||
      (current && current.timestamp > quote.timestamp)
    ) {
      return false;
    }
    latest.set(quote.symbol, quote);
    return true;
  }

  async function read(symbols: readonly string[]): Promise<boolean> {
    try {
      const quotes = await live.snapshot(symbols);
      if (!closed) {
        quotes.forEach(remember);
      }
      return true;
    } catch (err: unknown) {
      warn({ err, symbols }, "snapshot failed, will retry");
      if (!closed) withLastKnown([], symbols, live, calendar, now()).forEach(remember);
      return false;
    }
  }

  function start(symbols: readonly string[]): void {
    if (symbols.length === 0) {
      return;
    }
    const batch = read(symbols);
    for (const symbol of symbols) {
      const own = async () => (await batch) || symbols.length === 1 || closed || read([symbol]);
      inFlight.set(
        symbol,
        own().then(() => void inFlight.delete(symbol)),
      );
    }
  }

  async function fetch(symbols: readonly string[]): Promise<Quote[]> {
    const missing = [...new Set(symbols)].filter(
      (symbol) => !latest.has(symbol) || latest.get(symbol)?.lastKnown,
    );
    if (closed || missing.length === 0) {
      return [];
    }
    start(missing.filter((symbol) => !inFlight.has(symbol)));
    await Promise.all(missing.map((symbol) => inFlight.get(symbol)));
    return closed ? [] : missing.flatMap((symbol) => latest.get(symbol) ?? []);
  }

  return {
    latest,
    expire: () => expireBefore(latest, phaseStart(calendar, now())),
    remember,
    fetch,
    refresh: (symbols) => fetch(symbols.filter((symbol) => !inFlight.has(symbol))),
    forget: (symbols) => symbols.forEach((symbol) => latest.delete(symbol)),
    close() {
      closed = true;
    },
  };
}

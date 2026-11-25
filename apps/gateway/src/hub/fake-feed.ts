import type { MarketStatus, Quote } from "@mini/contracts";
import type { CatalogueEntry, Feed } from "../feeds/types.ts";

export interface FakeFeed extends Feed {
  readonly upstreamCalls: { readonly action: "subscribe" | "unsubscribe"; symbols: string[] }[];
  upstream(): string[];
  tick(symbol: string, price: string): void;
  setStatus(status: MarketStatus): void;
}

export const FAKE_SYMBOLS = ["AAPL", "MSFT", "NVDA", "SPY"];
const DAY_MS = 86_400_000;

function quoteOf(symbol: string, price: string, timestamp: number): Quote {
  return { symbol, price, change: "0.00", changePercent: "0.00", previousClose: price, timestamp };
}

export interface FakeFeedOptions {
  symbols?: readonly string[];
  now?: () => number;
  recordCalls?: boolean;
}

export function createFakeFeed({
  symbols = FAKE_SYMBOLS,
  now = () => Date.now(),
  recordCalls = false,
}: FakeFeedOptions = {}): FakeFeed {
  const entries: CatalogueEntry[] = symbols.map((symbol) => ({ symbol, name: `${symbol} Inc.` }));
  const active = new Set<string>();
  const upstreamCalls: FakeFeed["upstreamCalls"] = [];
  const quoteListeners = new Set<(quote: Quote) => void>();
  const statusListeners = new Set<(status: MarketStatus) => void>();
  let status: MarketStatus = "open";

  return {
    upstreamCalls,
    upstream: () => [...active].sort(),
    tick: (symbol, price) =>
      quoteListeners.forEach((listener) => listener(quoteOf(symbol, price, now()))),
    setStatus(next) {
      status = next;
      statusListeners.forEach((listener) => listener(next));
    },
    live: {
      subscribe(list) {
        if (recordCalls) {
          upstreamCalls.push({ action: "subscribe", symbols: [...list] });
        }
        list.forEach((symbol) => active.add(symbol));
      },
      unsubscribe(list) {
        if (recordCalls) {
          upstreamCalls.push({ action: "unsubscribe", symbols: [...list] });
        }
        list.forEach((symbol) => active.delete(symbol));
      },
      snapshot: async (list) => list.map((symbol) => quoteOf(symbol, "100.00", now())),
      onQuote(listener) {
        quoteListeners.add(listener);
        return () => quoteListeners.delete(listener);
      },
    },
    history: {
      history: async () => ({ bars: [], previousClose: "100.00" }),
    },
    catalogue: {
      all: () => entries,
      get: (symbol) => entries.find((entry) => entry.symbol === symbol),
      defaultList: () => symbols,
    },
    calendar: {
      status: () => status,
      session: (time) => ({ open: time - (time % DAY_MS), close: time - (time % DAY_MS) + DAY_MS }),
      onStatusChange(listener) {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      },
    },
  };
}

import type { Quote } from "@mini/contracts";
import type { LiveFeed } from "../types.ts";
import type { AlpacaCalendar } from "./calendar.ts";
import { POLL_INTERVAL_MS, SNAPSHOT_REUSE_MS, STREAM_SYMBOL_LIMIT } from "./config.ts";
import type { AlpacaHttp } from "./http.ts";
import { buildQuote } from "./quotes.ts";
import { pickStreamed, sameSet } from "./ranking.ts";
import { fetchSnapshots, quoteFromSnapshot } from "./snapshots.ts";
import type { TradeStream } from "./stream.ts";

export interface AlpacaLiveOptions {
  http: AlpacaHttp;
  calendar: AlpacaCalendar;
  openStream(onTrade: (symbol: string, price: string, time: number) => void): TradeStream;
  now: () => number;
  warn(detail: object, message: string): void;
}

export interface AlpacaLive extends LiveFeed {
  streamed(): ReadonlySet<string>;
  resync(): Promise<void>;
  close(): void;
}

interface Held {
  readonly quote: Quote;
  readonly at: number;
}

interface Recorder {
  readonly latest: ReadonlyMap<string, Held>;
  readonly listeners: Set<(quote: Quote) => void>;
  record(quote: Quote): void;
}

function sameQuote(a: Quote | undefined, b: Quote): boolean {
  return (
    a !== undefined &&
    a.price === b.price &&
    a.previousClose === b.previousClose &&
    a.timestamp === b.timestamp
  );
}

function createRecorder(now: () => number, isSubscribed: (symbol: string) => boolean): Recorder {
  const latest = new Map<string, Held>();
  const listeners = new Set<(quote: Quote) => void>();
  return {
    latest,
    listeners,
    record(quote) {
      const changed = !sameQuote(latest.get(quote.symbol)?.quote, quote);
      latest.set(quote.symbol, { quote, at: now() });
      if (changed && isSubscribed(quote.symbol)) {
        listeners.forEach((listener) => listener(quote));
      }
    },
  };
}

export function createAlpacaLive(options: AlpacaLiveOptions): AlpacaLive {
  const { http, calendar, now, warn } = options;
  const order = new Map<string, number>();
  const counts = new Map<string, number>();
  const { latest, listeners, record } = createRecorder(now, (symbol) => order.has(symbol));
  let streamed = new Set<string>();
  let sequence = 0;

  const onTrade = (symbol: string, price: string, time: number): void => {
    const baseline = latest.get(symbol)?.quote.previousClose;
    if (!streamed.has(symbol) || baseline === undefined || calendar.status(now()) !== "open") {
      return;
    }
    const quote = buildQuote(symbol, price, baseline, time);
    if (quote !== undefined && quote.timestamp >= (latest.get(symbol)?.quote.timestamp ?? 0)) {
      record(quote);
    }
  };
  const stream = options.openStream(onTrade);

  const fetchQuotes = async (symbols: readonly string[]): Promise<void> => {
    const snapshots = await fetchSnapshots(http, symbols);
    const moment = calendar.moment(now());
    for (const [symbol, snapshot] of snapshots) {
      const quote = quoteFromSnapshot(symbol, snapshot, moment);
      if (quote !== undefined) record(quote);
    }
  };

  const rebalance = (): void => {
    const next = pickStreamed({ order, counts }, streamed, STREAM_SYMBOL_LIMIT);
    if (!sameSet(next, streamed)) {
      streamed = next;
      stream.update(next);
    }
  };

  const poll = (): void => {
    const polled = [...order.keys()].filter((symbol) => !streamed.has(symbol));
    if (polled.length > 0 && calendar.status(now()) === "open") {
      fetchQuotes(polled).catch((err: unknown) => warn({ err }, "Alpaca snapshot poll failed"));
    }
  };
  const timer = setInterval(poll, POLL_INTERVAL_MS);

  return {
    subscribe(symbols) {
      symbols.forEach((symbol) => order.has(symbol) || order.set(symbol, (sequence += 1)));
      rebalance();
    },
    unsubscribe(symbols) {
      symbols.forEach((symbol) => order.delete(symbol));
      rebalance();
    },
    watchCount(symbol, count) {
      if (count > 0) counts.set(symbol, count);
      else counts.delete(symbol);
      if (order.has(symbol)) rebalance();
    },
    async snapshot(symbols) {
      const fresh = (symbol: string) =>
        (latest.get(symbol)?.at ?? -Infinity) > now() - SNAPSHOT_REUSE_MS;
      const missing = symbols.filter((symbol) => !fresh(symbol));
      if (missing.length > 0) await fetchQuotes(missing);
      return symbols.flatMap((symbol) => latest.get(symbol)?.quote ?? []);
    },
    onQuote(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    streamed: () => streamed,
    resync: () => (order.size > 0 ? fetchQuotes([...order.keys()]) : Promise.resolve()),
    close() {
      clearInterval(timer);
      stream.close();
    },
  };
}

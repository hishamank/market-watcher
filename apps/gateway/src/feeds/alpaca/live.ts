import type { LiveFeed } from "../types.ts";
import { snapshotQuotes } from "./baselines.ts";
import type { AlpacaCalendar } from "./calendar.ts";
import { POLL_INTERVAL_MS, SNAPSHOT_REUSE_MS, STREAM_SYMBOL_LIMIT } from "./config.ts";
import { createHeldQuotes, type HeldQuotes, sessionOf } from "./held-quotes.ts";
import type { AlpacaHttp } from "./http.ts";
import { pickStreamed, sameSet } from "./ranking.ts";
import { createSnapshotRequests } from "./requests.ts";
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

function liveSession(calendar: AlpacaCalendar, time: number, now: number): string | undefined {
  const { day } = calendar.moment(time);
  const session = sessionOf({ day, open: true });
  const inDay = time >= day.open && time < day.close;
  return inDay && session === sessionOf(calendar.moment(now)) ? session : undefined;
}

function pollDue(
  symbols: Iterable<string>,
  streamed: ReadonlySet<string>,
  held: HeldQuotes,
  calendar: AlpacaCalendar,
  now: number,
): string[] {
  const session = sessionOf(calendar.moment(now));
  const open = calendar.status(now) === "open";
  return [...symbols].filter(
    (symbol) => (open && !streamed.has(symbol)) || held.stale(symbol, session),
  );
}

async function recordSnapshots(
  { http, calendar, now }: AlpacaLiveOptions,
  held: HeldQuotes,
  symbols: readonly string[],
): Promise<void> {
  const moment = calendar.moment(now());
  const quotes = await snapshotQuotes(http, symbols, moment, calendar.days());
  const session = sessionOf(moment);
  const finished = sessionOf(calendar.moment(now()));
  if (finished !== session) {
    return;
  }
  quotes.forEach((quote) => held.record(quote, session));
  if (symbols.some((symbol) => !quotes.has(symbol)))
    throw new Error("Alpaca snapshot missing symbols");
}

function snapshotRequests(
  options: AlpacaLiveOptions,
  held: HeldQuotes,
  failed: Map<string, string>,
) {
  return createSnapshotRequests(async (symbols) => {
    const session = sessionOf(options.calendar.moment(options.now()));
    try {
      await recordSnapshots(options, held, symbols);
      symbols.forEach((symbol) => failed.delete(symbol));
    } catch (err) {
      symbols.forEach((symbol) => failed.set(symbol, session));
      throw err;
    }
  }, options.now);
}

async function readSnapshot(
  symbols: readonly string[],
  held: HeldQuotes,
  requests: ReturnType<typeof createSnapshotRequests>,
  failed: ReadonlyMap<string, string>,
  now: () => number,
  sessionNow: () => string,
) {
  const time = now();
  const session = sessionNow();
  const due = symbols.filter(
    (symbol) =>
      !held.fresh(symbol, session, time - SNAPSHOT_REUSE_MS) && requests.shouldAsk(symbol, time),
  );
  if (due.length > 0) await requests.fetch(due);
  if (
    symbols.some(
      (symbol) =>
        failed.get(symbol) === sessionNow() &&
        !held.fresh(symbol, sessionNow(), time - SNAPSHOT_REUSE_MS),
    )
  ) {
    throw new Error("Alpaca snapshot failed recently");
  }
  return symbols.flatMap((symbol) => held.current(symbol, sessionNow())?.quote ?? []);
}

export function createAlpacaLive(options: AlpacaLiveOptions): AlpacaLive {
  const { calendar, now, warn } = options;
  const order = new Map<string, number>();
  const counts = new Map<string, number>();
  const held = createHeldQuotes(now, (symbol) => order.has(symbol));
  const sessionNow = (): string => sessionOf(calendar.moment(now()));
  let streamed = new Set<string>();
  let sequence = 0;

  const onTrade = (symbol: string, price: string, time: number): void => {
    const session = liveSession(calendar, time, now());
    if (streamed.has(symbol) && session !== undefined) {
      held.trade(symbol, { price, time, session });
    }
  };
  const stream = options.openStream(onTrade);

  const failed = new Map<string, string>();
  const requests = snapshotRequests(options, held, failed);

  const rebalance = (): void => {
    const next = pickStreamed({ order, counts }, streamed, STREAM_SYMBOL_LIMIT);
    if (!sameSet(next, streamed)) {
      streamed = next;
      stream.update(next);
    }
  };

  const poll = (): void => {
    const due = pollDue(order.keys(), streamed, held, calendar, now());
    if (due.length > 0) {
      requests.fetch(due).catch((err: unknown) => warn({ err }, "Alpaca snapshot poll failed"));
    }
  };
  const timer = setInterval(poll, POLL_INTERVAL_MS);

  return {
    subscribe(symbols) {
      symbols.forEach((symbol) => order.has(symbol) || order.set(symbol, (sequence += 1)));
      rebalance();
    },
    unsubscribe(symbols) {
      symbols.forEach((symbol) => {
        order.delete(symbol);
        held.forget(symbol);
      });
      rebalance();
    },
    watchCount(symbol, count) {
      if (count > 0) counts.set(symbol, count);
      else counts.delete(symbol);
      if (order.has(symbol)) rebalance();
    },
    snapshot: (symbols) => readSnapshot(symbols, held, requests, failed, now, sessionNow),
    onQuote(listener) {
      held.listeners.add(listener);
      return () => void held.listeners.delete(listener);
    },
    lastKnown: held.lastKnown,
    streamed: () => streamed,
    resync: () => (order.size > 0 ? requests.fetch([...order.keys()]) : Promise.resolve()),
    close() {
      clearInterval(timer);
      stream.close();
    },
  };
}

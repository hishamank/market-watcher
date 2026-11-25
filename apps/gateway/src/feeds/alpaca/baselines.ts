import type { Quote } from "@mini/contracts";
import { DATA_FEED } from "./config.ts";
import { isFields, list, nested } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";
import { fetchBarPages } from "./pages.ts";
import type { TradingDay } from "./quotes.ts";
import {
  baselineBar,
  dailyBar,
  fetchSnapshots,
  type MarketMoment,
  quoteFromSnapshot,
  type SymbolSnapshot,
} from "./snapshots.ts";

async function fetchSessionCloses(
  http: AlpacaHttp,
  symbols: readonly string[],
  date: string,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const params = { symbols: symbols.join(","), timeframe: "1Day", start: date, end: date };
  const bodies = await fetchBarPages(http, { ...params, feed: DATA_FEED }, signal);
  const closes = new Map<string, string>();
  for (const body of bodies) {
    const bars = isFields(body) ? nested(body, "bars") : undefined;
    for (const symbol of symbols) {
      const bar = list(bars?.[symbol])
        .map((item) => dailyBar(isFields(item) ? item : undefined))
        .find((parsed) => parsed?.date === date);
      if (bar !== undefined) closes.set(symbol, bar.close);
    }
  }
  return closes;
}

async function completeBaselines(
  http: AlpacaHttp,
  snapshots: Map<string, SymbolSnapshot>,
  moment: MarketMoment,
  days: readonly TradingDay[],
  signal?: AbortSignal,
): Promise<void> {
  const missing = [...snapshots]
    .filter(([, snapshot]) => baselineBar(snapshot, moment.day) === undefined)
    .map(([symbol]) => symbol);
  const previous = days.filter((day) => day.date < moment.day.date).at(-1);
  if (missing.length === 0 || previous === undefined) {
    return;
  }
  const closes = await fetchSessionCloses(http, missing, previous.date, signal);
  for (const symbol of missing) {
    const close = closes.get(symbol);
    const snapshot = snapshots.get(symbol);
    if (close !== undefined && snapshot !== undefined) {
      snapshots.set(symbol, { ...snapshot, previousSession: { date: previous.date, close } });
    }
  }
}

export async function snapshotQuotes(
  http: AlpacaHttp,
  symbols: readonly string[],
  moment: MarketMoment,
  days: readonly TradingDay[],
  signal?: AbortSignal,
): Promise<Map<string, Quote>> {
  const snapshots = await fetchSnapshots(http, symbols, signal);
  await completeBaselines(http, snapshots, moment, days, signal);
  const quotes = new Map<string, Quote>();
  for (const [symbol, snapshot] of snapshots) {
    const quote = quoteFromSnapshot(symbol, snapshot, moment);
    if (quote !== undefined) quotes.set(symbol, quote);
  }
  return quotes;
}

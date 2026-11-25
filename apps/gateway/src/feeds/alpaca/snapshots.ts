import type { Quote } from "@mini/contracts";
import { DATA_FEED, SNAPSHOT_BATCH_SIZE } from "./config.ts";
import { epochMs, type Fields, isFields, nested, text } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";
import { newYorkDate } from "./new-york.ts";
import { buildQuote, type TradingDay } from "./quotes.ts";

interface DailyBar {
  readonly date: string;
  readonly close: string;
}

interface Trade {
  readonly price: string;
  readonly time: number;
}

export interface SymbolSnapshot {
  readonly trade?: Trade;
  readonly daily?: DailyBar;
  readonly previousDaily?: DailyBar;
}

export interface MarketMoment {
  readonly day: TradingDay;
  readonly open: boolean;
}

function dailyBar(fields: Fields | undefined): DailyBar | undefined {
  const time = epochMs(fields && text(fields, "t"));
  const close = fields && text(fields, "c");
  return time === undefined || close === undefined ? undefined : { date: newYorkDate(time), close };
}

function trade(fields: Fields | undefined): Trade | undefined {
  const time = epochMs(fields && text(fields, "t"));
  const price = fields && text(fields, "p");
  return time === undefined || price === undefined ? undefined : { price, time };
}

export function parseSnapshot(value: unknown): SymbolSnapshot {
  if (!isFields(value)) {
    return {};
  }
  const latest = trade(nested(value, "latestTrade"));
  const daily = dailyBar(nested(value, "dailyBar"));
  const previousDaily = dailyBar(nested(value, "prevDailyBar"));
  return {
    ...(latest !== undefined ? { trade: latest } : {}),
    ...(daily !== undefined ? { daily } : {}),
    ...(previousDaily !== undefined ? { previousDaily } : {}),
  };
}

export function quoteFromSnapshot(
  symbol: string,
  snapshot: SymbolSnapshot,
  { day, open }: MarketMoment,
): Quote | undefined {
  const bars = [snapshot.daily, snapshot.previousDaily];
  const sessionBar = bars.find((bar) => bar?.date === day.date);
  const baseBar = bars.find((bar) => bar !== undefined && bar.date < day.date);
  const baseline = baseBar?.close ?? sessionBar?.close;
  if (baseline === undefined) {
    return undefined;
  }
  const latest = snapshot.trade;
  const inSession =
    open && latest !== undefined && latest.time >= day.open && latest.time < day.close;
  if (inSession) {
    return buildQuote(symbol, latest.price, baseline, latest.time);
  }
  const price = sessionBar?.close ?? baseline;
  return buildQuote(symbol, price, baseline, open ? day.open : day.close);
}

function batches(symbols: readonly string[]): string[][] {
  const result: string[][] = [];
  for (let index = 0; index < symbols.length; index += SNAPSHOT_BATCH_SIZE) {
    result.push(symbols.slice(index, index + SNAPSHOT_BATCH_SIZE));
  }
  return result;
}

export async function fetchSnapshots(
  http: AlpacaHttp,
  symbols: readonly string[],
  signal?: AbortSignal,
): Promise<Map<string, SymbolSnapshot>> {
  const bodies = await Promise.all(
    batches([...new Set(symbols)]).map((batch) =>
      http.get(
        "data",
        "/v2/stocks/snapshots",
        { symbols: batch.join(","), feed: DATA_FEED },
        signal,
      ),
    ),
  );
  const result = new Map<string, SymbolSnapshot>();
  for (const body of bodies) {
    if (!isFields(body)) {
      continue;
    }
    for (const symbol of symbols) {
      if (body[symbol] !== undefined && body[symbol] !== null) {
        result.set(symbol, parseSnapshot(body[symbol]));
      }
    }
  }
  return result;
}

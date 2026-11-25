import type { Bar, Range } from "@mini/contracts";
import type { HistoryRequest, HistorySeries, HistorySource } from "../types.ts";
import type { AlpacaCalendar } from "./calendar.ts";
import { DATA_FEED, MAX_BAR_PAGES } from "./config.ts";
import { epochMs, isFields, list, nested, text } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";
import { displayPrice, type TradingDay } from "./quotes.ts";
import { fetchSnapshots, quoteFromSnapshot } from "./snapshots.ts";

const DAY_MS = 86_400_000;

interface RangePlan {
  readonly timeframe: string;
  readonly lookbackMs: number;
  readonly intraday: boolean;
}

export const RANGE_PLANS: Record<Range, RangePlan> = {
  "1D": { timeframe: "5Min", lookbackMs: 0, intraday: true },
  "1W": { timeframe: "30Min", lookbackMs: 7 * DAY_MS, intraday: true },
  "1M": { timeframe: "1Hour", lookbackMs: 30 * DAY_MS, intraday: true },
  "3M": { timeframe: "1Day", lookbackMs: 90 * DAY_MS, intraday: false },
  "1Y": { timeframe: "1Day", lookbackMs: 365 * DAY_MS, intraday: false },
  "5Y": { timeframe: "1Week", lookbackMs: 5 * 365 * DAY_MS, intraday: false },
};

function parseBars(body: unknown, symbol: string): { bars: Bar[]; next: string | undefined } {
  const fields = isFields(body) ? body : {};
  const bars = list(nested(fields, "bars")?.[symbol]).flatMap((item) => {
    const time = isFields(item) ? epochMs(text(item, "t")) : undefined;
    const raw = isFields(item) ? text(item, "c") : undefined;
    const close = raw === undefined ? undefined : displayPrice(raw);
    return time === undefined || close === undefined ? [] : [{ time, close }];
  });
  return { bars, next: text(fields, "next_page_token") };
}

async function fetchBars(http: AlpacaHttp, request: HistoryRequest, start: number): Promise<Bar[]> {
  const bars: Bar[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_BAR_PAGES; page += 1) {
    const body = await http.get(
      "data",
      "/v2/stocks/bars",
      {
        symbols: request.symbol,
        timeframe: RANGE_PLANS[request.range].timeframe,
        start: new Date(start).toISOString(),
        limit: "10000",
        adjustment: "split",
        feed: DATA_FEED,
        sort: "asc",
        page_token: pageToken,
      },
      request.signal,
    );
    const parsed = parseBars(body, request.symbol);
    bars.push(...parsed.bars);
    pageToken = parsed.next;
    if (pageToken === undefined) break;
  }
  return bars;
}

function inSessions(bar: Bar, days: readonly TradingDay[]): boolean {
  return days.some((day) => bar.time >= day.open && bar.time < day.close);
}

export function createAlpacaHistory(http: AlpacaHttp, calendar: AlpacaCalendar): HistorySource {
  return {
    async history(request: HistoryRequest): Promise<HistorySeries> {
      const plan = RANGE_PLANS[request.range];
      const moment = calendar.moment(request.now);
      const start = request.range === "1D" ? moment.day.open : request.now - plan.lookbackMs;
      const [bars, snapshots] = await Promise.all([
        fetchBars(http, request, start),
        fetchSnapshots(http, [request.symbol], request.signal),
      ]);
      const snapshot = snapshots.get(request.symbol);
      const quote = snapshot && quoteFromSnapshot(request.symbol, snapshot, moment);
      if (quote === undefined) {
        throw new Error(`Alpaca has no previous close for ${request.symbol}`);
      }
      const days = request.range === "1D" ? [moment.day] : calendar.days();
      const kept = plan.intraday ? bars.filter((bar) => inSessions(bar, days)) : bars;
      const series = { bars: kept, previousClose: quote.previousClose };
      if (request.range === "1D") {
        return { ...series, session: { open: moment.day.open, close: moment.day.close } };
      }
      return series;
    },
  };
}

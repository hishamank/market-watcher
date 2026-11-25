import type { Bar, Range } from "@mini/contracts";
import type { HistoryRequest, HistorySeries, HistorySource } from "../types.ts";
import type { AlpacaCalendar } from "./calendar.ts";
import { snapshotQuotes } from "./baselines.ts";
import { DATA_FEED } from "./config.ts";
import { epochMs, isFields, list, nested, text } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";
import { displayPrice, type TradingDay } from "./quotes.ts";
import { fetchBarPages } from "./pages.ts";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

interface RangePlan {
  readonly timeframe: string;
  readonly lookbackMs: number;
  readonly intradayBarMs?: number;
}

export const RANGE_PLANS: Record<Range, RangePlan> = {
  "1D": { timeframe: "5Min", lookbackMs: 0, intradayBarMs: 5 * MINUTE_MS },
  "1W": { timeframe: "30Min", lookbackMs: 7 * DAY_MS, intradayBarMs: 30 * MINUTE_MS },
  "1M": { timeframe: "1Hour", lookbackMs: 30 * DAY_MS, intradayBarMs: 60 * MINUTE_MS },
  "3M": { timeframe: "1Day", lookbackMs: 90 * DAY_MS },
  "1Y": { timeframe: "1Day", lookbackMs: 365 * DAY_MS },
  "5Y": { timeframe: "1Week", lookbackMs: 5 * 365 * DAY_MS },
};

function parseBars(body: unknown, symbol: string): Bar[] {
  const fields = isFields(body) ? body : {};
  return list(nested(fields, "bars")?.[symbol]).flatMap((item) => {
    const time = isFields(item) ? epochMs(text(item, "t")) : undefined;
    const raw = isFields(item) ? text(item, "c") : undefined;
    const close = raw === undefined ? undefined : displayPrice(raw);
    return time === undefined || close === undefined ? [] : [{ time, close }];
  });
}

async function fetchBars(http: AlpacaHttp, request: HistoryRequest, start: number): Promise<Bar[]> {
  const params = {
    symbols: request.symbol,
    timeframe: RANGE_PLANS[request.range].timeframe,
    start: new Date(start).toISOString(),
    adjustment: "split",
    feed: DATA_FEED,
    sort: "asc",
  };
  const bodies = await fetchBarPages(http, params, request.signal);
  return bodies.flatMap((body) => parseBars(body, request.symbol));
}

function inSessions(bar: Bar, barMs: number, days: readonly TradingDay[]): boolean {
  return days.some((day) => bar.time + barMs > day.open && bar.time < day.close);
}

export function createAlpacaHistory(http: AlpacaHttp, calendar: AlpacaCalendar): HistorySource {
  return {
    async history(request: HistoryRequest): Promise<HistorySeries> {
      const plan = RANGE_PLANS[request.range];
      const moment = calendar.moment(request.now);
      const start = request.range === "1D" ? moment.day.open : request.now - plan.lookbackMs;
      const [bars, quotes] = await Promise.all([
        fetchBars(http, request, start),
        snapshotQuotes(http, [request.symbol], moment, calendar.days(), request.signal),
      ]);
      const quote = quotes.get(request.symbol);
      if (quote === undefined) {
        throw new Error(`Alpaca has no previous close for ${request.symbol}`);
      }
      const days = request.range === "1D" ? [moment.day] : calendar.days();
      const barMs = plan.intradayBarMs;
      const kept = barMs === undefined ? bars : bars.filter((bar) => inSessions(bar, barMs, days));
      const series = { bars: kept, previousClose: quote.previousClose };
      if (request.range === "1D") {
        return { ...series, session: { open: moment.day.open, close: moment.day.close } };
      }
      return series;
    },
  };
}

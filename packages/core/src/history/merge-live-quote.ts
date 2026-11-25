import type { Bar, BarSize, HistoryResponse, Quote } from "@mini/contracts";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const EPOCH_TO_MONDAY_MS = 4 * DAY_MS;

export const BAR_SIZE_MS: Readonly<Record<BarSize, number>> = {
  "5m": 5 * MINUTE_MS,
  "30m": 30 * MINUTE_MS,
  "1h": 60 * MINUTE_MS,
  "1d": DAY_MS,
  "1w": 7 * DAY_MS,
};

type DayHistory = Extract<HistoryResponse, { range: "1D" }>;
type MultiDayHistory = Exclude<HistoryResponse, { range: "1D" }>;

export type LiveHistory =
  | Pick<DayHistory, "symbol" | "range" | "barSize" | "bars" | "session">
  | Pick<MultiDayHistory, "symbol" | "range" | "barSize" | "bars">;

function bucketOf(time: number, barSize: BarSize): number {
  const offset = barSize === "1w" ? EPOCH_TO_MONDAY_MS : 0;
  return Math.floor((time - offset) / BAR_SIZE_MS[barSize]);
}

function isInSession(history: LiveHistory, time: number): boolean {
  if (history.range !== "1D") return true;
  return time >= history.session.open && time < history.session.close;
}

export function mergeLiveQuote(history: LiveHistory, quote: Quote | undefined): readonly Bar[] {
  const { bars } = history;
  if (
    quote === undefined ||
    quote.symbol !== history.symbol ||
    !isInSession(history, quote.timestamp)
  ) {
    return bars;
  }
  const livePoint: Bar = { time: quote.timestamp, close: quote.price };
  const last = bars.at(-1);
  if (last === undefined) {
    return [livePoint];
  }
  if (quote.timestamp <= last.time) {
    return bars;
  }
  if (bucketOf(quote.timestamp, history.barSize) === bucketOf(last.time, history.barSize)) {
    return [...bars.slice(0, -1), livePoint];
  }
  return [...bars, livePoint];
}

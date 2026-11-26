import { changeBetween, type DayRange, joinRanges, type Quote, widenRange } from "@mini/contracts";
import { displayPriceAt, startOfUtcDay } from "./price.ts";

export const DAY_RANGE_STEP_MS = 5 * 60_000;

interface Sampled {
  readonly dayStart: number;
  readonly through: number;
  readonly range: DayRange;
}

const sampledDays = new Map<string, Sampled>();

function sampledRange(
  seed: string,
  symbol: string,
  timestamp: number,
  basePriceUnits: bigint | undefined,
): DayRange {
  const key = `${seed}\u0000${symbol}\u0000${basePriceUnits ?? ""}`;
  const dayStart = startOfUtcDay(timestamp);
  const cached = sampledDays.get(key);
  let sampled: Sampled =
    cached?.dayStart === dayStart && cached.through <= timestamp
      ? cached
      : {
          dayStart,
          through: dayStart,
          range: widenRange(undefined, displayPriceAt(seed, symbol, dayStart, basePriceUnits)),
        };
  for (let time = sampled.through + DAY_RANGE_STEP_MS; time <= timestamp;) {
    const price = displayPriceAt(seed, symbol, time, basePriceUnits);
    sampled = { dayStart, through: time, range: widenRange(sampled.range, price) };
    time += DAY_RANGE_STEP_MS;
  }
  sampledDays.set(key, sampled);
  return sampled.range;
}

export function quoteAt(
  seed: string,
  symbol: string,
  timeMs: number,
  basePriceUnits?: bigint,
): Quote {
  const timestamp = Math.floor(timeMs);
  const price = displayPriceAt(seed, symbol, timestamp, basePriceUnits);
  const previousClose = displayPriceAt(seed, symbol, startOfUtcDay(timestamp), basePriceUnits);
  const { change, changePercent } = changeBetween(previousClose, price);
  const dayRange = widenRange(sampledRange(seed, symbol, timestamp, basePriceUnits), price);
  return { symbol, price, change, changePercent, previousClose, timestamp, dayRange };
}

export function createDayRangeKeeper(): (quote: Quote) => Quote {
  const kept = new Map<string, { readonly dayStart: number; readonly range: DayRange }>();
  return (quote) => {
    if (quote.dayRange === undefined) {
      return quote;
    }
    const dayStart = startOfUtcDay(quote.timestamp);
    const held = kept.get(quote.symbol);
    const range =
      held?.dayStart === dayStart ? joinRanges(held.range, quote.dayRange) : quote.dayRange;
    kept.set(quote.symbol, { dayStart, range });
    return range === quote.dayRange ? quote : { ...quote, dayRange: range };
  };
}

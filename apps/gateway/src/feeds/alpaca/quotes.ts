import {
  changeBetween,
  type PriceRange,
  type Quote,
  QuoteSchema,
  roundToDisplay,
  toUnits,
  UNSIGNED_DECIMAL_PATTERN,
  widenRange,
} from "@mini/contracts";

export interface TradingDay {
  readonly date: string;
  readonly open: number;
  readonly close: number;
}

const SMALLEST_BASELINE = "0.0001";

export function displayPrice(raw: string): string | undefined {
  return UNSIGNED_DECIMAL_PATTERN.test(raw) ? roundToDisplay(raw) : undefined;
}

function baseline(raw: string): string | undefined {
  const rounded = displayPrice(raw);
  if (rounded === undefined) {
    return undefined;
  }
  return toUnits(rounded) > 0n ? rounded : SMALLEST_BASELINE;
}

function dayRange(raw: PriceRange | undefined, price: string): PriceRange | undefined {
  const low = raw && displayPrice(raw.low);
  const high = raw && displayPrice(raw.high);
  if (low === undefined || high === undefined) {
    return undefined;
  }
  return widenRange(widenRange({ low, high: low }, high), price);
}

export function buildQuote(
  symbol: string,
  rawPrice: string,
  rawPreviousClose: string,
  timestamp: number,
  rawRange?: PriceRange,
): Quote | undefined {
  const price = displayPrice(rawPrice);
  const previousClose = baseline(rawPreviousClose);
  if (price === undefined || previousClose === undefined) {
    return undefined;
  }
  const range = dayRange(rawRange, price);
  const quote = {
    symbol,
    price,
    ...changeBetween(previousClose, price),
    previousClose,
    timestamp,
    ...(range !== undefined ? { dayRange: range } : {}),
  };
  return QuoteSchema.safeParse(quote).success ? quote : undefined;
}

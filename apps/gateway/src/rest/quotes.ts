import type { Quote } from "@mini/contracts";
import type { Feed } from "../feeds/types.ts";
import { withLastKnown } from "../hub/last-known.ts";
import type { Warn } from "../hub/quote-book.ts";
import { isCurrentQuote } from "../hub/quote-phase.ts";
import { RestError } from "./errors.ts";

export async function fetchQuotesMap(
  feed: Feed,
  symbols: readonly string[],
  warn: Warn,
  now: () => number,
): Promise<Map<string, Quote>> {
  if (symbols.length === 0) return new Map();
  let quotes: Quote[] = [];
  try {
    quotes = await feed.live.snapshot(symbols);
  } catch (err) {
    warn({ err, symbols }, "live snapshot failed for REST request");
    quotes = withLastKnown([], symbols, feed.live, feed.calendar, now());
  }
  const available = quotes.filter(
    (quote) => quote.lastKnown || isCurrentQuote(quote, feed.calendar, now()),
  );
  if (available.length === 0) {
    throw new RestError(503, "unavailable", "Market quotes are temporarily unavailable");
  }
  return new Map(available.map((quote) => [quote.symbol, quote]));
}

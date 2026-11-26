import type { Quote } from "@mini/contracts";
import type { LiveFeed, MarketCalendar } from "../feeds/types.ts";
import { isCurrentQuote } from "./quote-phase.ts";

export function withLastKnown(
  quotes: readonly Quote[],
  symbols: readonly string[],
  live: LiveFeed,
  calendar: MarketCalendar,
  now: number,
): Quote[] {
  const current = quotes.filter((quote) => isCurrentQuote(quote, calendar, now));
  const missing = symbols.filter((symbol) => !current.some((quote) => quote.symbol === symbol));
  const held = live.lastKnown?.(missing) ?? [];
  return [
    ...current,
    ...held.map((quote): Quote =>
      isCurrentQuote(quote, calendar, now) ? quote : { ...quote, lastKnown: true },
    ),
  ];
}

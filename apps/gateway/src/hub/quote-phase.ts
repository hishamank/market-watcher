import type { Quote } from "@mini/contracts";
import type { MarketCalendar } from "../feeds/types.ts";

export function phaseStart(calendar: MarketCalendar, now: number): number {
  const status = calendar.status(now);
  const session = calendar.session(now);
  return status === "closed" && session.close <= now ? session.close : session.open;
}

export function isCurrentQuote(quote: Quote, calendar: MarketCalendar, now: number): boolean {
  return quote.timestamp >= phaseStart(calendar, now);
}

import type { SymbolErrorCode } from "@mini/contracts";
import type { QuoteStore } from "./quote-store.ts";

export function settleAvailability(
  store: QuoteStore,
  symbols: readonly string[],
  outcomes: ReadonlyMap<string, SymbolErrorCode>,
): void {
  for (const symbol of symbols) {
    const rejected = outcomes.get(symbol);
    if (
      rejected === "subscription_limit" ||
      rejected === "unknown_symbol" ||
      store.getAvailability(symbol) === "recovering"
    ) {
      store.setAvailability(symbol, "unavailable");
    }
  }
}

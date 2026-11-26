import type { Quote } from "@mini/contracts";
import { expect, test } from "vitest";
import { createHeldQuotes } from "./held-quotes.ts";
import { buildQuote } from "./quotes.ts";

const SESSION = "2025-06-24 open";

test("a same-session snapshot without a range keeps the day's high and low", () => {
  const published: Quote[] = [];
  const held = createHeldQuotes(
    () => 0,
    () => true,
  );
  held.listeners.add((quote) => published.push(quote));
  held.record(buildQuote("AAPL", "100.00", "95.00", 1_000, { low: "90", high: "110" })!, SESSION);
  held.record(buildQuote("AAPL", "95.00", "95.00", 2_000)!, SESSION);
  held.trade("AAPL", { price: "101", time: 3_000, session: SESSION });

  expect(published.map((quote) => quote.dayRange)).toEqual([
    { low: "90.00", high: "110.00" },
    { low: "90.00", high: "110.00" },
    { low: "90.00", high: "110.00" },
  ]);
});

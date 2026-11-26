import { expect, test } from "vitest";
import { QuoteSchema } from "./quote.ts";

test("lastKnown accepts only true or absence and survives parsing", () => {
  const quote = {
    symbol: "AAPL",
    price: "101.00",
    previousClose: "100.00",
    change: "1.00",
    changePercent: "1.00",
    timestamp: 1,
  };
  expect(QuoteSchema.parse({ ...quote, lastKnown: true })).toEqual({ ...quote, lastKnown: true });
  expect(QuoteSchema.parse(quote)).toEqual(quote);
  expect(QuoteSchema.safeParse({ ...quote, lastKnown: false }).success).toBe(false);
});

import { describe, expect, it } from "vitest";
import { aaplQuote } from "./fixtures.ts";
import { changeBetween } from "./money/money.ts";
import { QuoteSchema } from "./quote.ts";
import { parseClientFrame, parseServerFrame } from "./socket/frame.ts";

const quoteWith = (overrides: Record<string, string>) => ({ ...aaplQuote, ...overrides });

describe("quote baseline", () => {
  it("rejects a zero previous close", () => {
    expect(QuoteSchema.safeParse(quoteWith({ previousClose: "0.0000" })).success).toBe(false);
  });

  it("rejects a previous close that is not pre-rounded", () => {
    expect(QuoteSchema.safeParse(quoteWith({ previousClose: "0.000049" })).success).toBe(false);
  });

  it("accepts the smallest positive baseline", () => {
    const { change, changePercent } = changeBetween("0.0001", "0.0002");
    const quote = { ...aaplQuote, price: "0.0002", previousClose: "0.0001", change, changePercent };
    expect(QuoteSchema.safeParse(quote).success).toBe(true);
  });
});

describe("quote precision", () => {
  it("rejects a price with more digits than display precision", () => {
    expect(QuoteSchema.safeParse(quoteWith({ price: "187.425" })).success).toBe(false);
  });

  it("rejects a percent with more than two decimals", () => {
    expect(QuoteSchema.safeParse(quoteWith({ changePercent: "-1.3553" })).success).toBe(false);
  });

  it("accepts the largest supported quote end to end", () => {
    const price = "999999999999.99";
    const quote = {
      ...aaplQuote,
      price,
      previousClose: "0.0001",
      ...changeBetween("0.0001", price),
    };
    expect(QuoteSchema.safeParse(quote).success).toBe(true);
  });

  it("rejects a price above the cap", () => {
    expect(QuoteSchema.safeParse(quoteWith({ price: "1000000000000.00" })).success).toBe(false);
  });
});

describe("day range", () => {
  const withRange = (low: string, high: string) => ({ ...aaplQuote, dayRange: { low, high } });

  it("accepts a range that holds the price", () => {
    expect(QuoteSchema.safeParse(withRange("186.10", "191.25")).success).toBe(true);
  });

  it("accepts a range that ends at the price", () => {
    expect(QuoteSchema.safeParse(withRange("187.42", "187.42")).success).toBe(true);
  });

  it("rejects a high below the price", () => {
    expect(QuoteSchema.safeParse(withRange("186.10", "187.41")).success).toBe(false);
  });

  it("rejects a low above the price", () => {
    expect(QuoteSchema.safeParse(withRange("187.43", "191.25")).success).toBe(false);
  });

  it("rejects a malformed range in a frame instead of throwing", () => {
    const frame = JSON.stringify({ type: "quotes", quotes: [withRange("bad", "191.25")] });
    expect(parseServerFrame(frame).ok).toBe(false);
  });

  it("rejects a high that is not pre-rounded", () => {
    expect(QuoteSchema.safeParse(withRange("186.10", "191.255")).success).toBe(false);
  });
});

describe("partial subscriptions", () => {
  it("lets the gateway classify symbols the catalogue does not know", () => {
    const frame = JSON.stringify({
      type: "subscribe",
      requestId: 1,
      symbols: ["AAPL", "DELISTED-UNKNOWN-X"],
    });
    expect(parseClientFrame(frame).ok).toBe(true);
  });

  it("requires symbols on symbol errors", () => {
    const frame = JSON.stringify({
      type: "error",
      code: "unknown_symbol",
      message: "Unknown",
      requestId: 1,
    });
    expect(parseServerFrame(frame).ok).toBe(false);
  });

  it("reports long rejected symbols back to the client", () => {
    const error = {
      type: "error",
      code: "unknown_symbol",
      message: "x",
      requestId: 1,
      symbols: ["DELISTED-UNKNOWN-X"],
    };
    expect(parseServerFrame(JSON.stringify(error)).ok).toBe(true);
  });
});

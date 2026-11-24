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

describe("partial subscriptions", () => {
  it("lets the gateway classify symbols the catalogue does not know", () => {
    const frame = JSON.stringify({ type: "subscribe", symbols: ["AAPL", "DELISTED-UNKNOWN-X"] });
    expect(parseClientFrame(frame).ok).toBe(true);
  });

  it("requires symbols on symbol errors", () => {
    const frame = JSON.stringify({ type: "error", code: "unknown_symbol", message: "Unknown" });
    expect(parseServerFrame(frame).ok).toBe(false);
  });

  it("reports long rejected symbols back to the client", () => {
    const error = {
      type: "error",
      code: "unknown_symbol",
      message: "x",
      symbols: ["DELISTED-UNKNOWN-X"],
    };
    expect(parseServerFrame(JSON.stringify(error)).ok).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { aaplQuote } from "./fixtures.ts";
import { BAR_SIZE_BY_RANGE, RANGES } from "./range.ts";
import {
  HealthResponseSchema,
  HistoryQuerySchema,
  type HistoryResponse,
  HistoryResponseSchema,
  MAX_STOCKS_QUERY_SYMBOLS,
  RestErrorResponseSchema,
  StockDetailResponseSchema,
  StockListQuerySchema,
  StockListResponseSchema,
  StockSymbolParamsSchema,
} from "./rest.ts";

const roundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const dayHistory: HistoryResponse = {
  feedMode: "simulated",
  marketStatus: "open",
  symbol: "AAPL",
  range: "1D",
  barSize: "5m",
  session: { open: 1_764_000_000_000, close: 1_764_023_400_000 },
  previousClose: "190.00",
  bars: [
    { time: 1_764_000_000_000, close: "189.10" },
    { time: 1_764_000_300_000, close: "187.42" },
  ],
};

const yearHistory: HistoryResponse = {
  feedMode: "live",
  marketStatus: "closed",
  symbol: "AAPL",
  range: "1Y",
  barSize: "1d",
  previousClose: "190.00",
  bars: [{ time: 1_732_000_000_000, close: "0.9950" }],
  ageMs: 75_000,
};

describe("stock list and detail", () => {
  it("accepts the R01 gateway stub body", () => {
    const stub = { feedMode: "simulated", marketStatus: "open", stocks: [] };
    expect(StockListResponseSchema.parse(stub)).toEqual(stub);
  });

  it("round-trips a list", () => {
    const list = {
      feedMode: "live",
      marketStatus: "closed",
      stocks: [{ symbol: "AAPL", name: "Apple Inc.", quote: aaplQuote }],
    };
    expect(StockListResponseSchema.parse(roundTrip(list))).toEqual(list);
  });

  it("round-trips a detail", () => {
    const detail = {
      feedMode: "simulated",
      marketStatus: "open",
      stock: { symbol: "AAPL", name: "Apple Inc.", quote: aaplQuote },
    };
    expect(StockDetailResponseSchema.parse(roundTrip(detail))).toEqual(detail);
  });

  it("rejects a response without the feed mode", () => {
    expect(StockListResponseSchema.safeParse({ marketStatus: "open", stocks: [] }).success).toBe(
      false,
    );
  });
});

describe("history", () => {
  it.each([
    ["1D", dayHistory],
    ["1Y with an age", yearHistory],
  ])("round-trips %s", (_name, history) => {
    expect(HistoryResponseSchema.parse(roundTrip(history))).toEqual(history);
  });

  it.each(RANGES.filter((range) => range !== "1D"))("accepts %s at its bar size", (range) => {
    const history = { ...yearHistory, range, barSize: BAR_SIZE_BY_RANGE[range] };
    expect(HistoryResponseSchema.safeParse(history).success).toBe(true);
  });

  it("maps every range to its bar size", () => {
    expect(BAR_SIZE_BY_RANGE).toEqual({
      "1D": "5m",
      "1W": "30m",
      "1M": "1h",
      "3M": "1d",
      "1Y": "1d",
      "5Y": "1w",
    });
  });

  it.each([
    ["1D without a session", { ...dayHistory, session: undefined }],
    ["1D at a daily bar size", { ...dayHistory, barSize: "1d" }],
    ["1W at a daily bar size", { ...yearHistory, range: "1W", barSize: "1d" }],
    ["a session that closes before it opens", { ...dayHistory, session: { open: 2, close: 1 } }],
    ["an unknown range", { ...yearHistory, range: "2Y" }],
    ["a float close", { ...yearHistory, bars: [{ time: 1, close: 0.995 }] }],
    ["a negative age", { ...yearHistory, ageMs: -1 }],
  ])("rejects %s", (_name, value) => {
    expect(HistoryResponseSchema.safeParse(value).success).toBe(false);
  });

  it("narrows to a session on 1D", () => {
    const history = HistoryResponseSchema.parse(dayHistory);
    expect(history.range === "1D" && history.session.open).toBe(1_764_000_000_000);
  });
});

describe("REST inputs and errors", () => {
  it("parses stock list query symbols and rejects oversized lists", () => {
    expect(StockListQuerySchema.parse({})).toEqual({ symbols: undefined });
    expect(StockListQuerySchema.parse({ symbols: "" })).toEqual({ symbols: [] });
    expect(StockListQuerySchema.parse({ symbols: " AAPL , MSFT , " })).toEqual({
      symbols: ["AAPL", "MSFT"],
    });
    const tooMany = Array.from({ length: MAX_STOCKS_QUERY_SYMBOLS + 1 }, (_, i) => `S${i}`).join(
      ",",
    );
    expect(StockListQuerySchema.safeParse({ symbols: tooMany }).success).toBe(false);
    expect(StockListQuerySchema.safeParse({ symbols: ["AAPL"] }).success).toBe(false);
  });

  it("validates stock params and history query range", () => {
    expect(StockSymbolParamsSchema.parse({ symbol: "BRK.B" })).toEqual({ symbol: "BRK.B" });
    expect(StockSymbolParamsSchema.safeParse({ symbol: "" }).success).toBe(false);
    expect(HistoryQuerySchema.parse({})).toEqual({ range: "1D" });
    expect(HistoryQuerySchema.parse({ range: "1Y" })).toEqual({ range: "1Y" });
    expect(HistoryQuerySchema.safeParse({ range: "2Y" }).success).toBe(false);
    expect(HistoryQuerySchema.safeParse({ range: "" }).success).toBe(false);
  });

  it("round-trips REST error responses and rejects missing fields", () => {
    const body = {
      feedMode: "simulated",
      marketStatus: "open",
      error: { code: "rate_limited", message: "Too many requests" },
    };
    expect(RestErrorResponseSchema.parse(roundTrip(body))).toEqual(body);
    expect(
      RestErrorResponseSchema.safeParse({
        feedMode: "simulated",
        marketStatus: "open",
        error: { code: "unknown_code", message: "nope" },
      }).success,
    ).toBe(false);
    expect(
      RestErrorResponseSchema.safeParse({
        error: { code: "not_found", message: "Missing envelope" },
      }).success,
    ).toBe(false);
  });
});

describe("health response", () => {
  it("round-trips connections, upstream symbols and the cache hit rate", () => {
    const health = { connections: 2, upstreamSymbols: 30, historyCacheHitRate: 0.75 };
    expect(HealthResponseSchema.parse(roundTrip(health))).toEqual(health);
  });

  it("rejects a hit rate outside zero to one", () => {
    const health = { connections: 0, upstreamSymbols: 0, historyCacheHitRate: 1.5 };
    expect(HealthResponseSchema.safeParse(health).success).toBe(false);
  });
});

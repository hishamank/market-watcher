import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_QUERY_LENGTH,
  MAX_SEARCH_RESULTS,
  SearchQuerySchema,
  SearchResponseSchema,
} from "./rest.ts";

const roundTrip = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe("search schemas", () => {
  it("parses and trims valid search queries", () => {
    expect(SearchQuerySchema.parse({ q: "aapl" })).toEqual({ q: "aapl" });
    expect(SearchQuerySchema.parse({ q: "  Apple Inc  " })).toEqual({ q: "Apple Inc" });
    const exactMax = "a".repeat(MAX_SEARCH_QUERY_LENGTH);
    expect(SearchQuerySchema.parse({ q: exactMax })).toEqual({ q: exactMax });
  });

  it.each([
    ["missing q", {}],
    ["empty q", { q: "" }],
    ["whitespace-only q", { q: "   " }],
    ["too-long q", { q: "a".repeat(MAX_SEARCH_QUERY_LENGTH + 1) }],
    ["padded too-long q", { q: `${" ".repeat(MAX_SEARCH_QUERY_LENGTH)}a` }],
    ["repeated q array", { q: ["a", "b"] }],
  ])("rejects %s", (_name, value) => {
    expect(SearchQuerySchema.safeParse(value).success).toBe(false);
  });

  it("round-trips a valid search response", () => {
    const response = {
      feedMode: "simulated",
      marketStatus: "open",
      results: [
        { symbol: "AAPL", name: "Apple Inc." },
        { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B" },
      ],
    };
    expect(SearchResponseSchema.parse(roundTrip(response))).toEqual(response);
  });

  it("accepts an empty search result list and rejects invalid responses", () => {
    const empty = { feedMode: "live", marketStatus: "closed", results: [] };
    expect(SearchResponseSchema.parse(roundTrip(empty))).toEqual(empty);

    const tooMany = {
      feedMode: "simulated",
      marketStatus: "open",
      results: Array.from({ length: MAX_SEARCH_RESULTS + 1 }, (_, i) => ({
        symbol: `SYM${i}`,
        name: `Company ${i}`,
      })),
    };
    expect(SearchResponseSchema.safeParse(tooMany).success).toBe(false);
    expect(SearchResponseSchema.safeParse({ results: [] }).success).toBe(false);
    expect(
      SearchResponseSchema.safeParse({
        feedMode: "simulated",
        marketStatus: "open",
        results: [{ symbol: "", name: "Empty" }],
      }).success,
    ).toBe(false);
  });
});

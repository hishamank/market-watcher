import type { Stock } from "@mini/contracts";
import { describe, expect, it } from "vitest";
import { makeQuote } from "../testing/fake-platform.ts";
import { holdSortOrder, nextStockSort, sortStocks } from "./stock-sort.ts";

const stock = (symbol: string, name: string, price: string): Stock => ({
  symbol,
  name,
  quote: makeQuote(symbol, price, 1000),
});

const symbols = (stocks: readonly Stock[]) => stocks.map((item) => item.symbol);
const fromStock = (item: Stock) => item.quote;

describe("watchlist sorting", () => {
  const stocks = [
    stock("MSFT", "Microsoft", "9.99"),
    stock("AAPL", "apple", "10.00"),
    stock("NVDA", "NVIDIA", "187.4200"),
  ];

  it("orders prices by value, not by text", () => {
    const sort = { field: "price", direction: "asc" } as const;
    expect(symbols(sortStocks(stocks, sort, fromStock, "en-US"))).toEqual(["MSFT", "AAPL", "NVDA"]);
  });

  it("orders names without regard to case and reverses on descending", () => {
    const sort = { field: "name", direction: "desc" } as const;
    expect(symbols(sortStocks(stocks, sort, fromStock, "en-US"))).toEqual(["NVDA", "MSFT", "AAPL"]);
  });

  it("sorts by the quote it is given, so live prices win over the fetched ones", () => {
    const live = { ...makeQuote("MSFT", "500.00", 2000) };
    const quoteOf = (item: Stock) => (item.symbol === "MSFT" ? live : item.quote);
    const sort = { field: "price", direction: "desc" } as const;
    expect(symbols(sortStocks(stocks, sort, quoteOf, "en-US"))).toEqual(["MSFT", "NVDA", "AAPL"]);
  });

  it("puts rows without a day range last in both directions", () => {
    const ranged = (item: Stock, high: string): Stock => ({
      ...item,
      quote: { ...item.quote, dayRange: { low: "1.00", high } },
    });
    const withRanges = [stocks[0]!, ranged(stocks[1]!, "11.00"), ranged(stocks[2]!, "190.00")];
    for (const direction of ["asc", "desc"] as const) {
      const sorted = sortStocks(withRanges, { field: "dayHigh", direction }, fromStock, "en-US");
      expect(symbols(sorted).at(-1)).toBe("MSFT");
    }
  });

  it("cycles text first ascending and numbers first descending, then clears", () => {
    expect(nextStockSort(undefined, "symbol")).toEqual({ field: "symbol", direction: "asc" });
    expect(nextStockSort({ field: "symbol", direction: "asc" }, "symbol")).toEqual({
      field: "symbol",
      direction: "desc",
    });
    expect(nextStockSort({ field: "symbol", direction: "desc" }, "symbol")).toBeUndefined();
    expect(nextStockSort({ field: "symbol", direction: "asc" }, "change")).toEqual({
      field: "change",
      direction: "desc",
    });
  });

  describe("held order", () => {
    const byPrice = (items: readonly Stock[]) =>
      sortStocks(items, { field: "price", direction: "desc" }, fromStock, "en-US");
    const [msft, aapl, nvda] = stocks as [Stock, Stock, Stock];

    it("keeps the order while quotes change, and drops a removed symbol from it", () => {
      const first = holdSortOrder(undefined, "price", stocks, () => byPrice(stocks));
      expect(symbols(first.stocks)).toEqual(["NVDA", "AAPL", "MSFT"]);
      const ticked = [{ ...msft, quote: makeQuote("MSFT", "900.00", 2000) }, aapl, nvda];
      const held = holdSortOrder(first.snapshot, "price", ticked, () => byPrice(ticked));
      expect(symbols(held.stocks)).toEqual(["NVDA", "AAPL", "MSFT"]);
      expect(held.snapshot).toBe(first.snapshot);
      const removed = holdSortOrder(first.snapshot, "price", [msft, nvda], () =>
        byPrice([msft, nvda]),
      );
      expect(removed.snapshot?.order).toEqual(["NVDA", "MSFT"]);
    });

    it("sorts afresh when a removed symbol comes back or the sort is turned off and on", () => {
      const first = holdSortOrder(undefined, "price", stocks, () => byPrice(stocks));
      const removed = holdSortOrder(first.snapshot, "price", [msft, nvda], () =>
        byPrice([msft, nvda]),
      );
      const risen = [msft, { ...aapl, quote: makeQuote("AAPL", "999.00", 2000) }, nvda];
      const back = holdSortOrder(removed.snapshot, "price", risen, () => byPrice(risen));
      expect(symbols(back.stocks)).toEqual(["AAPL", "NVDA", "MSFT"]);
      const off = holdSortOrder(first.snapshot, undefined, risen, () => risen);
      expect(off.snapshot).toBeUndefined();
      const on = holdSortOrder(off.snapshot, "price", risen, () => byPrice(risen));
      expect(symbols(on.stocks)).toEqual(["AAPL", "NVDA", "MSFT"]);
    });
  });
});

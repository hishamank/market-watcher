import type { Stock } from "@mini/contracts";
import { STOCK_STALE_MS, stockQueryKeys } from "../rest/stock-queries.ts";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { inspectStockCache, planWatchlistBatches } from "./watchlist-batches.ts";

function makeStock(symbol: string): Stock {
  return {
    symbol,
    name: `${symbol} Inc.`,
    quote: {
      symbol,
      price: "100.00",
      change: "1.00",
      changePercent: "1.01",
      previousClose: "99.00",
      timestamp: 1_700_000_000_000,
    },
  };
}

describe("planWatchlistBatches cache coverage", () => {
  it("skips symbols covered by fresh symbols or detail queries", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockQueryKeys.symbols(["ABNB", "SNOW"]), {
      stocks: [makeStock("ABNB"), makeStock("SNOW")],
    });
    queryClient.setQueryData(stockQueryKeys.detail("RBLX"), {
      stock: makeStock("RBLX"),
    });

    const cache = inspectStockCache(queryClient);
    expect(planWatchlistBatches(["SNOW", "RBLX", "MSFT"], new Set(["MSFT"]), cache)).toEqual([]);
    expect(planWatchlistBatches(["RBLX", "SHOP"], new Set(["MSFT"]), cache)).toEqual([["SHOP"]]);
    expect(cache.bySymbol.get("RBLX")?.symbol).toBe("RBLX");
  });

  it("refetches stale cached symbols while still keeping their stock data for display", () => {
    const queryClient = new QueryClient();
    const staleAt = Date.now() - STOCK_STALE_MS - 1_000;
    queryClient.setQueryData(
      stockQueryKeys.detail("ABNB"),
      { stock: makeStock("ABNB") },
      { updatedAt: staleAt },
    );
    queryClient.setQueryData(stockQueryKeys.symbols(["SNOW"]), {
      stocks: [makeStock("SNOW")],
    });

    const cache = inspectStockCache(queryClient);
    expect(planWatchlistBatches(["ABNB", "SNOW"], new Set(), cache)).toEqual([["ABNB"]]);
    expect(cache.bySymbol.get("ABNB")?.symbol).toBe("ABNB");
  });

  it("treats unknown symbols from a fresh symbols query as covered without refetching", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockQueryKeys.symbols(["ABNB", "UNKNOWN"]), {
      stocks: [makeStock("ABNB")],
    });

    const cache = inspectStockCache(queryClient);
    expect(planWatchlistBatches(["ABNB", "UNKNOWN"], new Set(), cache)).toEqual([]);
  });
});

describe("planWatchlistBatches in-flight stability", () => {
  it("keeps in-flight batch identities stable when symbols are removed or added", async () => {
    const queryClient = new QueryClient();
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    const batchOne = Array.from({ length: 100 }, (_, i) => `S${String(i).padStart(3, "0")}`);
    const batchTwo = Array.from({ length: 5 }, (_, i) => `S${String(100 + i).padStart(3, "0")}`);

    const firstPromise = queryClient.fetchQuery({
      queryKey: stockQueryKeys.symbols(batchOne),
      queryFn: () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve({ stocks: batchOne.map(makeStock) });
        }),
    });
    const secondPromise = queryClient.fetchQuery({
      queryKey: stockQueryKeys.symbols(batchTwo),
      queryFn: () =>
        new Promise((resolve) => {
          releaseSecond = () => resolve({ stocks: batchTwo.map(makeStock) });
        }),
    });

    const cache = inspectStockCache(queryClient);
    const remaining = [...batchOne.slice(1), ...batchTwo];
    expect(planWatchlistBatches(remaining, new Set(), cache)).toEqual([batchOne, batchTwo]);
    expect(planWatchlistBatches([...remaining, "Z999"], new Set(), cache)).toEqual([
      batchOne,
      batchTwo,
      ["Z999"],
    ]);

    releaseFirst?.();
    releaseSecond?.();
    await Promise.all([firstPromise, secondPromise]);

    const settledCache = inspectStockCache(queryClient);
    expect(planWatchlistBatches(remaining, new Set(), settledCache)).toEqual([]);
  });
});

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createStatisticsFetcher, statisticsQueryOptions } from "./statistics-query.ts";

describe("statistics query boundary", () => {
  it("rejects malformed responses and statisticss belonging to another symbol", async () => {
    const client = new QueryClient();
    let payload: unknown = { symbol: "MSFT", source: "yahoo", fetchedAt: 1_000, statistics: null };
    const fetcher = createStatisticsFetcher({
      gatewayUrl: "http://gateway",
      fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    });
    await expect(client.fetchQuery(statisticsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Statistics symbol mismatch",
    );
    payload = { symbol: "AAPL", statistics: {} };
    await expect(client.fetchQuery(statisticsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Unexpected gateway response",
    );
    client.clear();
  });

  it("keeps symbol caches independent and reuses a fresh statistics", async () => {
    const paths: string[] = [];
    const fetcher = createStatisticsFetcher({
      gatewayUrl: "http://gateway",
      fetch: async (path) => {
        paths.push(path);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            symbol: path.includes("AAPL") ? "AAPL" : "SPY",
            source: "simulated",
            fetchedAt: 1_000,
            statistics: null,
          }),
        };
      },
    });
    const client = new QueryClient();
    for (const symbol of ["AAPL", "SPY", "AAPL"])
      await client.fetchQuery(statisticsQueryOptions(fetcher, symbol));
    expect(paths).toEqual([
      "http://gateway/stocks/AAPL/statistics",
      "http://gateway/stocks/SPY/statistics",
    ]);
    client.clear();
  });
});

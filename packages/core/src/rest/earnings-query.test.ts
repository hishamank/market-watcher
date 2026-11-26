import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createEarningsFetcher, earningsQueryOptions } from "./earnings-query.ts";

describe("earnings query boundary", () => {
  it("rejects malformed responses and earningss belonging to another symbol", async () => {
    const client = new QueryClient();
    let payload: unknown = { symbol: "MSFT", source: "yahoo", fetchedAt: 1_000, earnings: null };
    const fetcher = createEarningsFetcher({
      gatewayUrl: "http://gateway",
      fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    });
    await expect(client.fetchQuery(earningsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Earnings symbol mismatch",
    );
    payload = { symbol: "AAPL", earnings: {} };
    await expect(client.fetchQuery(earningsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Unexpected gateway response",
    );
    client.clear();
  });

  it("keeps symbol caches independent and reuses a fresh earnings", async () => {
    const paths: string[] = [];
    const fetcher = createEarningsFetcher({
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
            earnings: null,
          }),
        };
      },
    });
    const client = new QueryClient();
    for (const symbol of ["AAPL", "SPY", "AAPL"])
      await client.fetchQuery(earningsQueryOptions(fetcher, symbol));
    expect(paths).toEqual([
      "http://gateway/stocks/AAPL/earnings",
      "http://gateway/stocks/SPY/earnings",
    ]);
    client.clear();
  });
});

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createNewsFetcher, newsQueryOptions } from "./news-query.ts";

describe("news query boundary", () => {
  it("rejects malformed responses and newss belonging to another symbol", async () => {
    const client = new QueryClient();
    let payload: unknown = { symbol: "MSFT", source: "yahoo", fetchedAt: 1_000, articles: [] };
    const fetcher = createNewsFetcher({
      gatewayUrl: "http://gateway",
      fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    });
    await expect(client.fetchQuery(newsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "News symbol mismatch",
    );
    payload = { symbol: "AAPL", articles: {} };
    await expect(client.fetchQuery(newsQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Unexpected gateway response",
    );
    client.clear();
  });

  it("keeps symbol caches independent and reuses a fresh news", async () => {
    const paths: string[] = [];
    const fetcher = createNewsFetcher({
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
            articles: [],
          }),
        };
      },
    });
    const client = new QueryClient();
    for (const symbol of ["AAPL", "SPY", "AAPL"])
      await client.fetchQuery(newsQueryOptions(fetcher, symbol));
    expect(paths).toEqual(["http://gateway/stocks/AAPL/news", "http://gateway/stocks/SPY/news"]);
    client.clear();
  });
});

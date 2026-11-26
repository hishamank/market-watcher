import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createProfileFetcher, profileQueryOptions } from "./profile-query.ts";

describe("profile query boundary", () => {
  it("rejects malformed responses and profiles belonging to another symbol", async () => {
    const client = new QueryClient();
    let payload: unknown = { symbol: "MSFT", source: "yahoo", fetchedAt: 1_000, profile: null };
    const fetcher = createProfileFetcher({
      gatewayUrl: "http://gateway",
      fetch: async () => ({ ok: true, status: 200, json: async () => payload }),
    });
    await expect(client.fetchQuery(profileQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Profile symbol mismatch",
    );
    payload = { symbol: "AAPL", profile: {} };
    await expect(client.fetchQuery(profileQueryOptions(fetcher, "AAPL"))).rejects.toThrow(
      "Unexpected gateway response",
    );
    client.clear();
  });

  it("keeps symbol caches independent and reuses a fresh profile", async () => {
    const paths: string[] = [];
    const fetcher = createProfileFetcher({
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
            profile: null,
          }),
        };
      },
    });
    const client = new QueryClient();
    for (const symbol of ["AAPL", "SPY", "AAPL"])
      await client.fetchQuery(profileQueryOptions(fetcher, symbol));
    expect(paths).toEqual([
      "http://gateway/stocks/AAPL/profile",
      "http://gateway/stocks/SPY/profile",
    ]);
    client.clear();
  });
});

import {
  MAX_SEARCH_QUERY_LENGTH,
  MAX_SEARCH_RESULTS,
  RestErrorResponseSchema,
  SearchResponseSchema,
} from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { type RestGateway, startRestGateway, TEST_ORIGIN } from "./testing.ts";

const active: RestGateway[] = [];

async function launch(options?: Parameters<typeof startRestGateway>[0]): Promise<RestGateway> {
  const gateway = await startRestGateway(options);
  active.push(gateway);
  return gateway;
}

afterEach(async () => {
  while (active.length > 0) {
    await active.pop()?.close();
  }
});

describe("REST search ranking and limits", () => {
  it("ranks exact ticker, then ticker prefix, then name word start, case-insensitively", async () => {
    const gw = await launch();

    const exactRes = await gw.get("/stocks/search?q=aapl");
    expect(exactRes.status).toBe(200);
    const exactBody = SearchResponseSchema.parse(await exactRes.json());
    expect(exactBody.feedMode).toBe("simulated");
    expect(exactBody.marketStatus).toBe("open");
    expect(exactBody.results[0]).toEqual({ symbol: "AAPL", name: "Apple Inc." });

    const mixedRes = await gw.get("/stocks/search?q=APP");
    expect(mixedRes.status).toBe(200);
    const mixedBody = SearchResponseSchema.parse(await mixedRes.json());
    expect(mixedBody.results[0]?.symbol).toBe("APP");
    expect(mixedBody.results.some((item) => item.symbol === "AAPL")).toBe(true);

    const prefixRes = await gw.get("/stocks/search?q=ap");
    expect(prefixRes.status).toBe(200);
    const prefixBody = SearchResponseSchema.parse(await prefixRes.json());
    const prefixSymbols = prefixBody.results.map((item) => item.symbol);
    const firstNameMatchIndex = prefixSymbols.findIndex((symbol) => !symbol.startsWith("AP"));
    expect(firstNameMatchIndex).toBeGreaterThan(0);
    expect(prefixSymbols.slice(firstNameMatchIndex).some((s) => s.startsWith("AP"))).toBe(false);
    expect(prefixSymbols.slice(firstNameMatchIndex)).toContain("AAPL");
  });

  it("matches only the start of words in company names and caps results at 10", async () => {
    const gw = await launch();

    const cappedRes = await gw.get("/stocks/search?q=a");
    expect(cappedRes.status).toBe(200);
    const cappedBody = SearchResponseSchema.parse(await cappedRes.json());
    expect(cappedBody.results).toHaveLength(MAX_SEARCH_RESULTS);
    expect(cappedBody.results[0]?.symbol).toBe("A");

    const midWordRes = await gw.get("/stocks/search?q=pple");
    expect(midWordRes.status).toBe(200);
    expect(SearchResponseSchema.parse(await midWordRes.json()).results).toEqual([]);

    const nameRes = await gw.get("/stocks/search?q=apple");
    expect(nameRes.status).toBe(200);
    expect(SearchResponseSchema.parse(await nameRes.json()).results).toEqual([
      { symbol: "AAPL", name: "Apple Inc." },
    ]);
  });
});

describe("REST search validation and hardening", () => {
  it("returns 400 with the REST error body for empty, whitespace, missing or too-long q", async () => {
    const gw = await launch();
    const tooLong = "a".repeat(MAX_SEARCH_QUERY_LENGTH + 1);

    for (const path of [
      "/stocks/search",
      "/stocks/search?q=",
      "/stocks/search?q=%20%20",
      `/stocks/search?q=${tooLong}`,
    ]) {
      const res = await gw.get(path, { Origin: TEST_ORIGIN });
      expect(res.status).toBe(400);
      expect(res.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
      const body = RestErrorResponseSchema.parse(await res.json());
      expect(body.feedMode).toBe("simulated");
      expect(body.marketStatus).toBe("open");
      expect(body.error.code).toBe("invalid_request");
    }
  });

  it("applies CORS, market status and the REST rate limit on /stocks/search", async () => {
    const gw = await launch({ rateLimit: { max: 2, timeWindow: 60_000 } });
    gw.feed.updateSettings({ forceClosed: true });

    const first = await gw.get("/stocks/search?q=AAPL", { Origin: TEST_ORIGIN });
    expect(first.status).toBe(200);
    expect(first.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    expect(SearchResponseSchema.parse(await first.json()).marketStatus).toBe("closed");

    const second = await gw.get("/stocks/search?q=MSFT", { Origin: "https://evil.example" });
    expect(second.status).toBe(200);
    expect(second.headers.get("access-control-allow-origin")).toBeNull();

    const blocked = await gw.get("/stocks/search?q=NVDA", { Origin: TEST_ORIGIN });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    expect(RestErrorResponseSchema.parse(await blocked.json()).error.code).toBe("rate_limited");
  });
});

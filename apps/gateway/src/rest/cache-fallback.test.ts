import { HistoryResponseSchema, RestErrorResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { DAY_MS, startOfUtcDay } from "../feeds/simulator/index.ts";
import type { HistorySeries, HistorySource } from "../feeds/types.ts";
import { HISTORY_CACHE_MAX_ENTRIES } from "./limits.ts";
import { FIXED_NOW, type RestGateway, startRestGateway } from "./testing.ts";

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

describe("history cache freshness by range and calendar", () => {
  it("applies 1W, 1M-to-close and closed-market freshness rules", async () => {
    const gw = await launch();

    await gw.get("/stocks/AAPL/history?range=1W");
    gw.advanceMs(299_000);
    await gw.get("/stocks/AAPL/history?range=1W");
    expect(gw.historyCalls).toHaveLength(1);

    await gw.get("/stocks/AAPL/history?range=1M");
    gw.setNow(startOfUtcDay(FIXED_NOW) + DAY_MS - 1_000);
    await gw.get("/stocks/AAPL/history?range=1M");
    expect(gw.historyCalls).toHaveLength(2);

    gw.feed.updateSettings({ forceClosed: true });
    await gw.get("/stocks/MSFT/history?range=1D");
    gw.advanceMs(3_600_000);
    await gw.get("/stocks/MSFT/history?range=1D");
    expect(gw.historyCalls).toHaveLength(3);

    gw.feed.updateSettings({ forceClosed: false });
    await gw.get("/stocks/MSFT/history?range=1D");
    expect(gw.historyCalls).toHaveLength(4);
  });
});

describe("history cache fallback chain", () => {
  it("falls back through sources, then to an expired entry with ageMs, then to 503", async () => {
    let fallbackCalls = 0;
    let failFallback = false;
    const fallbackSeries: HistorySeries = {
      bars: [{ time: FIXED_NOW, close: "200.00" }],
      previousClose: "199.00",
      session: { open: startOfUtcDay(FIXED_NOW), close: startOfUtcDay(FIXED_NOW) + DAY_MS },
    };
    const fallback: HistorySource = {
      async history() {
        fallbackCalls += 1;
        if (failFallback) throw new Error("fallback unavailable");
        return fallbackSeries;
      },
    };
    const gw = await launch({ historyFallbacks: [fallback] });

    const initial = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(initial.bars.length).toBeGreaterThan(0);
    expect(fallbackCalls).toBe(0);

    gw.feed.updateSettings({ historyFailureRate: 1 });
    gw.advanceMs(125_000);
    const fromFallback = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(fallbackCalls).toBe(1);
    expect(fromFallback.bars).toEqual(fallbackSeries.bars);
    expect(fromFallback.ageMs).toBeUndefined();

    failFallback = true;
    gw.advanceMs(150_000);
    const staleRes = await gw.get("/stocks/AAPL/history?range=1D");
    expect(staleRes.status).toBe(200);
    const stale = HistoryResponseSchema.parse(await staleRes.json());
    expect(stale.bars).toEqual(fallbackSeries.bars);
    expect(stale.ageMs).toBe(150_000);

    const missRes = await gw.get("/stocks/NVDA/history?range=1D");
    expect(missRes.status).toBe(503);
    expect(RestErrorResponseSchema.parse(await missRes.json()).error.code).toBe("unavailable");
  });

  it("keeps the expired entry when a background SWR refresh fails", async () => {
    const gw = await launch();
    const first = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );

    gw.feed.updateSettings({ historyFailureRate: 1 });
    gw.advanceMs(90_000);
    const swr = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(swr).toEqual(first);
    expect(swr.ageMs).toBeUndefined();

    gw.advanceMs(40_000);
    const aged = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(aged.bars).toEqual(first.bars);
    expect(aged.ageMs).toBe(130_000);
  });
});

describe("history cache LRU eviction", () => {
  it("defaults to 500 entries and evicts the least recently used entry at the cap", async () => {
    expect(HISTORY_CACHE_MAX_ENTRIES).toBe(500);
    const gw = await launch({ historyCacheMaxEntries: 3 });

    await gw.get("/stocks/AAPL/history?range=1D");
    await gw.get("/stocks/MSFT/history?range=1D");
    await gw.get("/stocks/NVDA/history?range=1D");
    expect(gw.historyCalls).toHaveLength(3);

    await gw.get("/stocks/AAPL/history?range=1D");
    await gw.get("/stocks/SPY/history?range=1D");
    expect(gw.historyCalls).toHaveLength(4);

    await gw.get("/stocks/AAPL/history?range=1D");
    await gw.get("/stocks/NVDA/history?range=1D");
    expect(gw.historyCalls).toHaveLength(4);

    await gw.get("/stocks/MSFT/history?range=1D");
    expect(gw.historyCalls).toHaveLength(5);
  });
});

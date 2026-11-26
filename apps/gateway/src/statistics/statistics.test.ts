import { afterEach, describe, expect, it, vi } from "vitest";
import { StockStatisticsResponseSchema, type StockStatistics } from "@mini/contracts";
import { buildApp, type AppOptions } from "../app.ts";
import { createSimulatorFeed } from "../feeds/index.ts";

const statistics: StockStatistics = {
  currency: "USD",
  marketCap: "2800000000000",
  trailingPE: "28.42",
  trailingEps: "6.43",
  dividendYield: "0.0045",
  averageVolume: 52400000,
  yearRange: { low: "124.17", high: "237.49" },
};
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
});

function setup(overrides: Partial<AppOptions> = {}) {
  const feed = createSimulatorFeed({ seed: "statistics-test" });
  const app = buildApp({
    feed,
    feedMode: "live",
    allowedOrigins: new Set(),
    logger: false,
    ...overrides,
  });
  cleanups.push(async () => {
    await app.close();
    feed.close();
  });
  return app;
}

describe("company statistics REST seam", () => {
  it("coalesces requests, validates provenance and refreshes after the cache expires", async () => {
    let now = 1_000;
    const deferred = Promise.withResolvers<StockStatistics>();
    const load = vi.fn(() => deferred.promise);
    const app = setup({ statisticsSource: { load }, now: () => now });
    const waiting = Promise.all(
      Array.from({ length: 4 }, () => app.inject("/stocks/AAPL/statistics")),
    );
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    deferred.resolve(statistics);
    const responses = await waiting;
    expect(load).toHaveBeenCalledTimes(1);
    const body = StockStatisticsResponseSchema.parse(responses[0]?.json());
    expect(body).toEqual({ symbol: "AAPL", source: "yahoo", fetchedAt: now, statistics });
    now += 3_600_001;
    expect((await app.inject("/stocks/AAPL/statistics")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never calls an external source in simulator mode and supports funds and absent statisticss", async () => {
    const load = vi.fn(async () => statistics);
    const app = setup({ feedMode: "simulated", statisticsSource: { load } });
    const apple = StockStatisticsResponseSchema.parse(
      (await app.inject("/stocks/AAPL/statistics")).json(),
    );
    const fund = StockStatisticsResponseSchema.parse(
      (await app.inject("/stocks/SPY/statistics")).json(),
    );
    const missing = StockStatisticsResponseSchema.parse(
      (await app.inject("/stocks/NVDA/statistics")).json(),
    );
    expect(apple.source).toBe("simulated");
    expect(fund.statistics?.trailingPE).toBeNull();
    expect(fund.statistics?.marketCap).toBeNull();
    expect(missing.statistics).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect((await app.inject("/stocks/NOPE123/statistics")).statusCode).toBe(404);
  });

  it("contains upstream failures and rejects malformed ranges while quotes remain available", async () => {
    const load = vi.fn(async (): Promise<StockStatistics> => ({
      ...statistics,
      yearRange: { low: "200", high: "100" },
    }));
    const app = setup({ statisticsSource: { load } });
    expect((await app.inject("/stocks/AAPL/statistics")).statusCode).toBe(503);
    expect((await app.inject("/stocks/AAPL")).statusCode).toBe(200);
    load.mockResolvedValue(statistics);
    expect((await app.inject("/stocks/AAPL/statistics")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("bounds a stalled source and releases the symbol for retry", async () => {
    const load = vi.fn(
      (_symbol: string, signal: AbortSignal) =>
        new Promise<StockStatistics | null>((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const app = setup({ statisticsSource: { load }, statisticsTimeoutMs: 20 });
    expect((await app.inject("/stocks/AAPL/statistics")).statusCode).toBe(503);
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
    load.mockResolvedValue(statistics);
    expect((await app.inject("/stocks/AAPL/statistics")).statusCode).toBe(200);
  });
});

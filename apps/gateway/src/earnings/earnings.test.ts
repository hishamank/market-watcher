import { afterEach, describe, expect, it, vi } from "vitest";
import { StockEarningsResponseSchema, type StockEarnings } from "@mini/contracts";
import { buildApp, type AppOptions } from "../app.ts";
import { createSimulatorFeed } from "../feeds/index.ts";

const earnings: StockEarnings = {
  currency: "USD",
  basis: "gaap",
  nextReport: null,
  quarters: [
    { fiscalYear: 2026, fiscalQuarter: 1, periodEnd: 1000, actual: "1.25", estimate: "1.20" },
  ],
};
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
});

function setup(overrides: Partial<AppOptions> = {}) {
  const feed = createSimulatorFeed({ seed: "earnings-test" });
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

describe("company earnings REST seam", () => {
  it("coalesces requests, validates provenance and refreshes after the cache expires", async () => {
    let now = 1_000;
    const deferred = Promise.withResolvers<StockEarnings>();
    const load = vi.fn(() => deferred.promise);
    const app = setup({ earningsSource: { load }, now: () => now });
    const waiting = Promise.all(
      Array.from({ length: 4 }, () => app.inject("/stocks/AAPL/earnings")),
    );
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    deferred.resolve(earnings);
    const responses = await waiting;
    expect(load).toHaveBeenCalledTimes(1);
    const body = StockEarningsResponseSchema.parse(responses[0]?.json());
    expect(body).toEqual({ symbol: "AAPL", source: "yahoo", fetchedAt: now, earnings });
    now += 3_600_001;
    expect((await app.inject("/stocks/AAPL/earnings")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never calls an external source in simulator mode and supports funds and absent earningss", async () => {
    const load = vi.fn(async () => earnings);
    const app = setup({ feedMode: "simulated", earningsSource: { load } });
    const apple = StockEarningsResponseSchema.parse(
      (await app.inject("/stocks/AAPL/earnings")).json(),
    );
    const fund = StockEarningsResponseSchema.parse(
      (await app.inject("/stocks/SPY/earnings")).json(),
    );
    const missing = StockEarningsResponseSchema.parse(
      (await app.inject("/stocks/NVDA/earnings")).json(),
    );
    expect(apple.source).toBe("simulated");
    expect(fund.earnings).toBeNull();

    expect(missing.earnings).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect((await app.inject("/stocks/NOPE123/earnings")).statusCode).toBe(404);
  });

  it("contains upstream failures and rejects malformed amounts while quotes remain available", async () => {
    const load = vi.fn(async (): Promise<StockEarnings> => ({
      ...earnings,
      quarters: [
        { fiscalYear: 2026, fiscalQuarter: 1, periodEnd: 1000, actual: "bad", estimate: "1" },
      ],
    }));
    const app = setup({ earningsSource: { load } });
    expect((await app.inject("/stocks/AAPL/earnings")).statusCode).toBe(503);
    expect((await app.inject("/stocks/AAPL")).statusCode).toBe(200);
    load.mockResolvedValue(earnings);
    expect((await app.inject("/stocks/AAPL/earnings")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("bounds a stalled source and releases the symbol for retry", async () => {
    const load = vi.fn(
      (_symbol: string, signal: AbortSignal) =>
        new Promise<StockEarnings | null>((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const app = setup({ earningsSource: { load }, earningsTimeoutMs: 20 });
    expect((await app.inject("/stocks/AAPL/earnings")).statusCode).toBe(503);
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
    load.mockResolvedValue(earnings);
    expect((await app.inject("/stocks/AAPL/earnings")).statusCode).toBe(200);
  });
});

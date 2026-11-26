import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyProfileResponseSchema, type CompanyProfile } from "@mini/contracts";
import { buildApp, type AppOptions } from "../app.ts";
import { createSimulatorFeed } from "../feeds/index.ts";

const profile: CompanyProfile = {
  kind: "company",
  description: "A test company",
  sector: "Technology",
  industry: null,
  exchange: "Nasdaq",
  website: { url: "https://example.com/", label: "example.com" },
};
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
});

function setup(overrides: Partial<AppOptions> = {}) {
  const feed = createSimulatorFeed({ seed: "profile-test" });
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

describe("company profile REST seam", () => {
  it("coalesces requests, validates provenance and refreshes after the cache expires", async () => {
    let now = 1_000;
    const deferred = Promise.withResolvers<CompanyProfile>();
    const load = vi.fn(() => deferred.promise);
    const app = setup({ profileSource: { load }, now: () => now });
    const waiting = Promise.all(
      Array.from({ length: 4 }, () => app.inject("/stocks/AAPL/profile")),
    );
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    deferred.resolve(profile);
    const responses = await waiting;
    expect(load).toHaveBeenCalledTimes(1);
    const body = CompanyProfileResponseSchema.parse(responses[0]?.json());
    expect(body).toEqual({ symbol: "AAPL", source: "yahoo", fetchedAt: now, profile });
    now += 86_400_001;
    expect((await app.inject("/stocks/AAPL/profile")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never calls an external source in simulator mode and supports funds and absent profiles", async () => {
    const load = vi.fn(async () => profile);
    const app = setup({ feedMode: "simulated", profileSource: { load } });
    const apple = CompanyProfileResponseSchema.parse(
      (await app.inject("/stocks/AAPL/profile")).json(),
    );
    const fund = CompanyProfileResponseSchema.parse(
      (await app.inject("/stocks/SPY/profile")).json(),
    );
    const missing = CompanyProfileResponseSchema.parse(
      (await app.inject("/stocks/NVDA/profile")).json(),
    );
    expect(apple.source).toBe("simulated");
    expect(fund.profile?.kind).toBe("fund");
    expect(fund.profile?.sector).toBeNull();
    expect(missing.profile).toBeNull();
    expect(load).not.toHaveBeenCalled();
    expect((await app.inject("/stocks/NOPE123/profile")).statusCode).toBe(404);
  });

  it("contains upstream failures and rejects unsafe links while quotes remain available", async () => {
    const load = vi.fn(async (): Promise<CompanyProfile> => ({
      ...profile,
      website: { url: "javascript:alert(1)", label: "unsafe" },
    }));
    const app = setup({ profileSource: { load } });
    expect((await app.inject("/stocks/AAPL/profile")).statusCode).toBe(503);
    expect((await app.inject("/stocks/AAPL")).statusCode).toBe(200);
    load.mockResolvedValue(profile);
    expect((await app.inject("/stocks/AAPL/profile")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("bounds a stalled source and releases the symbol for retry", async () => {
    const load = vi.fn(
      (_symbol: string, signal: AbortSignal) =>
        new Promise<CompanyProfile | null>((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const app = setup({ profileSource: { load }, profileTimeoutMs: 20 });
    expect((await app.inject("/stocks/AAPL/profile")).statusCode).toBe(503);
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
    load.mockResolvedValue(profile);
    expect((await app.inject("/stocks/AAPL/profile")).statusCode).toBe(200);
  });
});

it("refreshes all-null profiles after five minutes so recovered data becomes visible", async () => {
  let now = 1_000;
  const empty: CompanyProfile = {
    kind: "company",
    description: null,
    sector: null,
    industry: null,
    exchange: null,
    website: null,
  };
  const load = vi.fn(async () => empty);
  const app = setup({ profileSource: { load }, now: () => now });
  await app.inject("/stocks/AAPL/profile");
  load.mockResolvedValue(profile);
  now += 299_999;
  await app.inject("/stocks/AAPL/profile");
  expect(load).toHaveBeenCalledTimes(1);
  now += 2;
  const result = CompanyProfileResponseSchema.parse(
    (await app.inject("/stocks/AAPL/profile")).json(),
  );
  expect(result.profile).toEqual(profile);
  expect(load).toHaveBeenCalledTimes(2);
});

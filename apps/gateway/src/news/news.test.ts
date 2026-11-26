import { afterEach, describe, expect, it, vi } from "vitest";
import { StockNewsResponseSchema, type NewsArticle } from "@mini/contracts";
import { buildApp, type AppOptions } from "../app.ts";
import { createSimulatorFeed } from "../feeds/index.ts";

const articles: NewsArticle[] = [
  {
    id: "one",
    title: "A headline",
    url: "https://example.com/article",
    site: "example.com",
    publisher: null,
    publishedAt: 1000,
    thumbnail: null,
  },
];
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanups.splice(0)) await close();
});
function setup(overrides: Partial<AppOptions> = {}) {
  const feed = createSimulatorFeed({ seed: "news-test" });
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

describe("news REST seam", () => {
  it("coalesces requests and refreshes after ten minutes", async () => {
    let now = 1000;
    const deferred = Promise.withResolvers<NewsArticle[]>();
    const load = vi.fn(() => deferred.promise);
    const app = setup({ newsSource: { load }, now: () => now });
    const waiting = Promise.all(Array.from({ length: 4 }, () => app.inject("/stocks/AAPL/news")));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    deferred.resolve(articles);
    const responses = await waiting;
    expect(StockNewsResponseSchema.parse(responses[0]?.json())).toEqual({
      symbol: "AAPL",
      source: "yahoo",
      fetchedAt: now,
      articles,
    });
    await app.inject("/stocks/AAPL/news");
    expect(load).toHaveBeenCalledTimes(1);
    now += 600001;
    await app.inject("/stocks/AAPL/news");
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("keeps the simulator offline and supports empty news and unknown symbols", async () => {
    const load = vi.fn(async () => articles);
    const app = setup({ feedMode: "simulated", newsSource: { load } });
    const apple = StockNewsResponseSchema.parse((await app.inject("/stocks/AAPL/news")).json());
    expect(apple.source).toBe("simulated");
    expect(apple.articles).toHaveLength(6);
    expect(
      StockNewsResponseSchema.parse((await app.inject("/stocks/NVDA/news")).json()).articles,
    ).toEqual([]);
    expect((await app.inject("/stocks/NOPE123/news")).statusCode).toBe(404);
    expect(load).not.toHaveBeenCalled();
  });
  it("contains invalid articles and lets prices keep working and news retry", async () => {
    const load = vi.fn(async () =>
      articles.map((article) => ({ ...article, url: "javascript:alert(1)" })),
    );
    const app = setup({ newsSource: { load } });
    expect((await app.inject("/stocks/AAPL/news")).statusCode).toBe(503);
    expect((await app.inject("/stocks/AAPL")).statusCode).toBe(200);
    load.mockResolvedValue(articles);
    expect((await app.inject("/stocks/AAPL/news")).statusCode).toBe(200);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it("aborts a stalled feed and releases the symbol for retry", async () => {
    const load = vi.fn(
      (_symbol: string, signal: AbortSignal) =>
        new Promise<NewsArticle[]>((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
    );
    const app = setup({ newsSource: { load }, newsTimeoutMs: 20 });
    expect((await app.inject("/stocks/AAPL/news")).statusCode).toBe(503);
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
    load.mockResolvedValue([]);
    expect(
      StockNewsResponseSchema.parse((await app.inject("/stocks/AAPL/news")).json()).articles,
    ).toEqual([]);
  });
});

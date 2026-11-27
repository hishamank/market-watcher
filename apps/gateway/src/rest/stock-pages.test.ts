import { RestErrorResponseSchema, StockPageResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import type { Catalogue, CatalogueEntry, LiveFeed } from "../feeds/types.ts";
import { type RestGateway, type RestGatewayOptions, startRestGateway } from "./testing.ts";

const active: RestGateway[] = [];

async function launch(options?: RestGatewayOptions): Promise<RestGateway> {
  const gateway = await startRestGateway(options);
  active.push(gateway);
  return gateway;
}

afterEach(async () => {
  while (active.length > 0) {
    await active.pop()?.close();
  }
});

async function page(gw: RestGateway, query: string) {
  const res = await gw.get(`/stocks?${query}`);
  expect(res.status).toBe(200);
  return StockPageResponseSchema.parse(await res.json());
}

describe("REST stock pages", () => {
  it("walks the whole catalogue once, default list first, then by symbol", async () => {
    const gw = await launch();
    const seen: string[] = [];
    let cursor: string | null = null;
    let requests = 0;
    do {
      const suffix: string = cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`;
      const body = await page(gw, `limit=50${suffix}`);
      seen.push(...body.stocks.map((stock) => stock.symbol));
      cursor = body.nextCursor;
      requests += 1;
    } while (cursor !== null && requests < 20);

    const defaults = gw.feed.catalogue.defaultList();
    const others = gw.feed.catalogue
      .all()
      .map((entry) => entry.symbol)
      .filter((symbol) => !defaults.includes(symbol))
      .sort((a, b) => (a < b ? -1 : 1));
    expect(cursor).toBeNull();
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual([...defaults, ...others]);
    expect(requests).toBe(Math.ceil(seen.length / 50));
  }, 10_000);

  it("continues after a cursor that has left the catalogue", async () => {
    const gw = await launch();
    const body = await page(gw, "limit=3&cursor=ZZZZ0");
    expect(body.stocks.every((stock) => stock.symbol > "ZZZZ0")).toBe(true);
    const later = gw.feed.catalogue
      .all()
      .filter(
        (entry) => entry.symbol > "A0" && !gw.feed.catalogue.defaultList().includes(entry.symbol),
      )
      .map((entry) => entry.symbol)
      .sort((a, b) => (a < b ? -1 : 1));
    expect((await page(gw, "limit=2&cursor=A0")).stocks.map((s) => s.symbol)).toEqual(
      later.slice(0, 2),
    );
  });
});

describe("REST stock pages when the catalogue or quotes change", () => {
  it("resumes at the next listed stock when a refresh removes the cursor's stock", async () => {
    const removed = new Set<string>();
    const listings = new Map<string, readonly CatalogueEntry[]>();
    const wrapCatalogue = (base: Catalogue): Catalogue => ({
      all: () => {
        const key = [...removed].join();
        const listing = listings.get(key) ?? base.all().filter((e) => !removed.has(e.symbol));
        listings.set(key, listing);
        return listing;
      },
      get: (symbol) => (removed.has(symbol) ? undefined : base.get(symbol)),
      defaultList: () => base.defaultList().filter((symbol) => !removed.has(symbol)),
    });
    const gw = await launch({ wrapCatalogue });
    const first = await page(gw, "limit=50");
    const deeper = await page(gw, `limit=10&cursor=${first.nextCursor}`);
    const afterDeeper = await page(gw, `limit=1&cursor=${deeper.nextCursor}`);

    removed.add(first.nextCursor ?? "");
    const resumed = await page(gw, `limit=10&cursor=${first.nextCursor}`);
    expect(resumed.stocks.map((s) => s.symbol)).toEqual(deeper.stocks.map((s) => s.symbol));

    removed.add(deeper.nextCursor ?? "");
    const resumedDeeper = await page(gw, `limit=1&cursor=${deeper.nextCursor}`);
    expect(resumedDeeper.stocks[0]?.symbol).toBe(afterDeeper.stocks[0]?.symbol);
  });

  it("returns an empty page with its cursor when no quote is current, and 503 when the snapshot fails", async () => {
    const upstream = { mode: "ok" as "ok" | "stale" | "down" };
    const wrapLive = (base: LiveFeed): LiveFeed => ({
      ...base,
      snapshot: async (symbols) => {
        if (upstream.mode === "down") throw new Error("upstream down");
        const quotes = await base.snapshot(symbols);
        return upstream.mode === "stale"
          ? quotes.map((quote) => ({ ...quote, timestamp: 0 }))
          : quotes;
      },
    });
    const gw = await launch({ wrapLive });
    const { nextCursor } = await page(gw, "limit=5");

    upstream.mode = "stale";
    const empty = await page(gw, `limit=5&cursor=${nextCursor}`);
    expect(empty.stocks).toEqual([]);
    expect(empty.nextCursor).not.toBeNull();
    expect((await gw.get("/stocks?limit=5")).status).toBe(503);

    upstream.mode = "down";
    const failed = await gw.get(`/stocks?limit=5&cursor=${nextCursor}`);
    expect(failed.status).toBe(503);
    expect(RestErrorResponseSchema.parse(await failed.json()).error.code).toBe("unavailable");
  });
});

describe("REST stock page validation", () => {
  it("rejects symbols combined with a cursor or a limit, and limits over 100", async () => {
    const gw = await launch();
    for (const query of ["symbols=AAPL&limit=10", "symbols=AAPL&cursor=AAPL", "limit=101"]) {
      const res = await gw.get(`/stocks?${query}`);
      expect(res.status).toBe(400);
      expect(RestErrorResponseSchema.parse(await res.json()).error.code).toBe("invalid_request");
    }
  });
});

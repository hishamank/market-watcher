import { RestErrorResponseSchema, StockPageResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { type RestGateway, startRestGateway } from "./testing.ts";

const active: RestGateway[] = [];

async function launch(): Promise<RestGateway> {
  const gateway = await startRestGateway();
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
  });

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

  it("rejects symbols combined with a cursor or a limit, and limits over 100", async () => {
    const gw = await launch();
    for (const query of ["symbols=AAPL&limit=10", "symbols=AAPL&cursor=AAPL", "limit=101"]) {
      const res = await gw.get(`/stocks?${query}`);
      expect(res.status).toBe(400);
      expect(RestErrorResponseSchema.parse(await res.json()).error.code).toBe("invalid_request");
    }
  });
});

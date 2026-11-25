import {
  BAR_SIZE_BY_RANGE,
  HistoryResponseSchema,
  RANGES,
  RestErrorResponseSchema,
  StockDetailResponseSchema,
  StockListResponseSchema,
} from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { DAY_MS, startOfUtcDay } from "../feeds/simulator/index.ts";
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

describe("REST stocks and detail endpoints", () => {
  it("returns the 50 default list stocks with feedMode, marketStatus and deterministic quotes", async () => {
    const gw = await launch();
    const res = await gw.get("/stocks");
    expect(res.status).toBe(200);
    const body = StockListResponseSchema.parse(await res.json());
    expect(body.feedMode).toBe("simulated");
    expect(body.marketStatus).toBe("open");
    expect(body.stocks).toHaveLength(50);
    expect(body.stocks[0]?.symbol).toBe("AAPL");
    expect(body.stocks[0]?.quote).toEqual(gw.feed.quoteAt("AAPL", FIXED_NOW));
  });

  it("filters and preserves order for ?symbols= including non-default catalogue stocks", async () => {
    const gw = await launch();
    const nonDefault = gw.feed.catalogue
      .all()
      .find((entry) => !gw.feed.catalogue.defaultList().includes(entry.symbol));
    expect(nonDefault).toBeDefined();

    const res = await gw.get(`/stocks?symbols=${nonDefault!.symbol},AAPL,NOPE123,AAPL`);
    expect(res.status).toBe(200);
    const body = StockListResponseSchema.parse(await res.json());
    expect(body.stocks.map((stock) => stock.symbol)).toEqual([nonDefault!.symbol, "AAPL"]);

    const emptyRes = await gw.get("/stocks?symbols=");
    expect(emptyRes.status).toBe(200);
    expect(StockListResponseSchema.parse(await emptyRes.json()).stocks).toEqual([]);
  });

  it("returns 400 with the error body when ?symbols= exceeds 100 symbols", async () => {
    const gw = await launch();
    const symbols = Array.from({ length: 101 }, (_, i) => `SYM${i}`).join(",");
    const res = await gw.get(`/stocks?symbols=${symbols}`);
    expect(res.status).toBe(400);
    const body = RestErrorResponseSchema.parse(await res.json());
    expect(body.feedMode).toBe("simulated");
    expect(body.marketStatus).toBe("open");
    expect(body.error.code).toBe("invalid_request");
  });

  it("returns stock detail for catalogue symbols and 404 outside the catalogue", async () => {
    const gw = await launch();
    const okRes = await gw.get("/stocks/BRK.B");
    expect(okRes.status).toBe(200);
    const detail = StockDetailResponseSchema.parse(await okRes.json());
    expect(detail.stock.symbol).toBe("BRK.B");
    expect(detail.stock.quote).toEqual(gw.feed.quoteAt("BRK.B", FIXED_NOW));

    const missingRes = await gw.get("/stocks/NOPE123");
    expect(missingRes.status).toBe(404);
    const missing = RestErrorResponseSchema.parse(await missingRes.json());
    expect(missing.feedMode).toBe("simulated");
    expect(missing.marketStatus).toBe("open");
    expect(missing.error.code).toBe("not_found");
  });

  it("reflects closed market status across responses", async () => {
    const gw = await launch();
    gw.feed.updateSettings({ forceClosed: true });

    const okRes = await gw.get("/stocks/AAPL");
    expect(okRes.status).toBe(200);
    expect(StockDetailResponseSchema.parse(await okRes.json()).marketStatus).toBe("closed");

    const missingRes = await gw.get("/stocks/NOPE123");
    expect(missingRes.status).toBe(404);
    expect(RestErrorResponseSchema.parse(await missingRes.json()).marketStatus).toBe("closed");
  });
});

describe("REST history endpoint", () => {
  it("serves all six ranges with ADR 0029 bar sizes, 1D session span and previousClose", async () => {
    const gw = await launch();
    const liveQuote = gw.feed.quoteAt("AAPL", FIXED_NOW);

    for (const range of RANGES) {
      const res = await gw.get(`/stocks/AAPL/history?range=${range}`);
      expect(res.status).toBe(200);
      const body = HistoryResponseSchema.parse(await res.json());
      expect(body.feedMode).toBe("simulated");
      expect(body.marketStatus).toBe("open");
      expect(body.barSize).toBe(BAR_SIZE_BY_RANGE[range]);
      expect(body.previousClose).toBe(liveQuote.previousClose);
      expect(body.bars.at(-1)?.close).toBe(liveQuote.price);
      expect(body.ageMs).toBeUndefined();
      if (body.range === "1D") {
        expect(body.session).toEqual({
          open: startOfUtcDay(FIXED_NOW),
          close: startOfUtcDay(FIXED_NOW) + DAY_MS,
        });
      }
    }
  });

  it("defaults omitted range to 1D and rejects invalid range or unknown symbol", async () => {
    const gw = await launch();
    const defaultRes = await gw.get("/stocks/AAPL/history");
    expect(defaultRes.status).toBe(200);
    expect(HistoryResponseSchema.parse(await defaultRes.json()).range).toBe("1D");

    const badRange = await gw.get("/stocks/AAPL/history?range=2Y");
    expect(badRange.status).toBe(400);
    expect(RestErrorResponseSchema.parse(await badRange.json()).error.code).toBe("invalid_request");

    const unknown = await gw.get("/stocks/NOPE123/history?range=1D");
    expect(unknown.status).toBe(404);
    expect(RestErrorResponseSchema.parse(await unknown.json()).error.code).toBe("not_found");
  });
});

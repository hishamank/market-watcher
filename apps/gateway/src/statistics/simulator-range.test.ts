import {
  HistoryResponseSchema,
  StockDetailResponseSchema,
  StockStatisticsResponseSchema,
} from "@mini/contracts";
import { afterEach, expect, it } from "vitest";
import { startRestGateway, type RestGateway } from "../rest/testing.ts";

const active: RestGateway[] = [];
afterEach(async () => {
  for (const gateway of active.splice(0)) await gateway.close();
});

it("omits unsupported simulated year bounds instead of contradicting deterministic prices", async () => {
  const gateway = await startRestGateway({
    seed: "demo-v1",
    initialNow: Date.UTC(2026, 10, 27, 12),
  });
  active.push(gateway);
  const detail = StockDetailResponseSchema.parse(await (await gateway.get("/stocks/AAPL")).json());
  const history = HistoryResponseSchema.parse(
    await (await gateway.get("/stocks/AAPL/history?range=1Y")).json(),
  );
  expect(detail.stock.quote.price).toBe("327.80");
  expect(history.bars.at(-1)?.close).toBe(detail.stock.quote.price);
  for (const symbol of ["AAPL", "MSFT", "SPY", "QQQ", "VTI"]) {
    const body = StockStatisticsResponseSchema.parse(
      await (await gateway.get(`/stocks/${symbol}/statistics`)).json(),
    );
    expect(body.source).toBe("simulated");
    expect(body.statistics).not.toBeNull();
    expect(body.statistics?.yearRange).toBeNull();
  }
});

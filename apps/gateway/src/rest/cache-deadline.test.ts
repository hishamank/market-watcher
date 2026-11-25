import { HistoryResponseSchema, RestErrorResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { DAY_MS, startOfUtcDay } from "../feeds/simulator/index.ts";
import type { HistorySeries } from "../feeds/types.ts";
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

describe("a history source that never settles", () => {
  it("times out, falls back, and lets the next request reach the recovered source", async () => {
    let hung = false;
    const gw = await launch({
      historySourceTimeoutMs: 50,
      wrapHistory: (base) => ({
        history: (request) => (hung ? new Promise<HistorySeries>(() => {}) : base.history(request)),
      }),
    });

    await gw.get("/stocks/AAPL/history?range=1D");
    gw.advanceMs(130_000);
    hung = true;

    const fallback = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(fallback.ageMs).toBe(130_000);

    const missing = await gw.get("/stocks/MSFT/history?range=1D");
    expect(missing.status).toBe(503);
    RestErrorResponseSchema.parse(await missing.json());

    hung = false;
    const recovered = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(recovered.ageMs).toBeUndefined();
    expect(gw.historyCalls).toHaveLength(4);
    expect(gw.historyCalls.every((request) => request.signal !== undefined)).toBe(true);
  });
});

describe("the 1D cache across a session change", () => {
  it("refetches when a new session starts, even inside the freshness window", async () => {
    const nextDay = startOfUtcDay(FIXED_NOW) + DAY_MS;
    const gw = await launch({ initialNow: nextDay - 10_000 });

    const before = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    gw.advanceMs(20_000);
    const after = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );

    expect(gw.historyCalls).toHaveLength(2);
    expect(before).toMatchObject({ session: { open: nextDay - DAY_MS } });
    expect(after).toMatchObject({ session: { open: nextDay } });
  });
});

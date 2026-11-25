import { afterEach, expect, test } from "vitest";
import { type AlpacaRig, fixture, SESSION_NOW, startAlpaca } from "./testing.ts";

const PRE_MARKET_NOW = Date.parse("2025-06-25T12:30:00Z");

let rig: AlpacaRig | undefined;

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
});

function startPreMarket(): Promise<AlpacaRig> {
  return startAlpaca(
    (alpaca) => {
      alpaca.clock = "after-hours";
      alpaca.routes.set("/v2/stocks/snapshots", () => fixture("snapshots-pre-market.json"));
    },
    { now: () => PRE_MARKET_NOW },
  );
}

test("before the open, a missing older baseline is fetched as the preceding session's close", async () => {
  rig = await startPreMarket();

  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toEqual([
    {
      symbol: "AAPL",
      price: "201.50",
      change: "1.20",
      changePercent: "0.60",
      previousClose: "200.30",
      timestamp: Date.parse("2025-06-24T20:00:00Z"),
    },
  ]);
  const daily = rig.alpaca.calls("/v2/stocks/bars").at(-1);
  expect(daily?.searchParams.get("timeframe")).toBe("1Day");
  expect(daily?.searchParams.get("start")).toBe("2025-06-23");
  expect(daily?.searchParams.get("end")).toBe("2025-06-23T20:00:00.000Z");
  expect(daily?.searchParams.get("feed")).toBe("iex");
});

test("a missing baseline that cannot be fetched rejects instead of showing no change", async () => {
  rig = await startPreMarket();
  rig.alpaca.failing.set("/v2/stocks/bars", 500);

  await expect(rig.feed.live.snapshot(["AAPL"])).rejects.toThrow("HTTP 500");
  await expect(
    rig.feed.history.history({ symbol: "AAPL", range: "1Y", now: PRE_MARKET_NOW }),
  ).rejects.toThrow();
});

test("during the session, a missing previous daily bar is fetched too", async () => {
  rig = await startAlpaca((alpaca) =>
    alpaca.routes.set("/v2/stocks/snapshots", () => {
      const recorded = JSON.parse(fixture("snapshots.json")) as { AAPL: Record<string, unknown> };
      delete recorded.AAPL["prevDailyBar"];
      return JSON.stringify(recorded);
    }),
  );

  const series = await rig.feed.history.history({ symbol: "AAPL", range: "1D", now: SESSION_NOW });
  expect(series.previousClose).toBe("200.30");
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toMatchObject([
    { price: "201.56", change: "1.26", previousClose: "200.30" },
  ]);
});

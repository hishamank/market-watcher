import type { MarketStatus } from "@mini/contracts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { STATUS_CHECK_INTERVAL_MS } from "./config.ts";
import { AFTER_HOURS_NOW, type AlpacaRig, fixture, startAlpaca } from "./testing.ts";

let rig: AlpacaRig | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
});

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
  vi.useRealTimers();
});

const SESSION_24 = {
  open: Date.parse("2025-06-24T13:30:00Z"),
  close: Date.parse("2025-06-24T20:00:00Z"),
};

test("after-hours and pre-market count as closed, and the session is the last regular one", async () => {
  rig = await startAlpaca((alpaca) => (alpaca.clock = "after-hours"), {
    now: () => AFTER_HOURS_NOW,
  });
  const { calendar } = rig.feed;
  const preMarket = Date.parse("2025-06-25T12:00:00Z");

  expect(calendar.status(AFTER_HOURS_NOW)).toBe("closed");
  expect(calendar.session(AFTER_HOURS_NOW)).toEqual(SESSION_24);
  expect(calendar.status(preMarket)).toBe("closed");
  expect(calendar.session(preMarket)).toEqual(SESSION_24);
  expect(calendar.status(Date.parse("2025-06-25T13:30:00Z"))).toBe("open");
});

test("an early close ends the session at the calendar's close", async () => {
  rig = await startAlpaca();
  expect(rig.feed.calendar.session(Date.parse("2025-07-03T16:00:00Z"))).toEqual({
    open: Date.parse("2025-07-03T13:30:00Z"),
    close: Date.parse("2025-07-03T17:00:00Z"),
  });
});

test("the close fires onStatusChange and refreshes the catalogue and the clock", async () => {
  let now = SESSION_24.close - 1;
  rig = await startAlpaca(undefined, { now: () => now });
  const changes: MarketStatus[] = [];
  rig.feed.calendar.onStatusChange((status) => changes.push(status));
  rig.alpaca.assets = fixture("assets-after-refresh.json");
  rig.alpaca.clock = "after-hours";
  expect(rig.feed.catalogue.get("NEWCO")).toBeUndefined();

  await vi.advanceTimersByTimeAsync(STATUS_CHECK_INTERVAL_MS);
  expect(changes).toEqual([]);

  now = SESSION_24.close;
  await vi.advanceTimersByTimeAsync(STATUS_CHECK_INTERVAL_MS);
  expect(changes).toEqual(["closed"]);
  expect(rig.alpaca.calls("/v2/assets")).toHaveLength(2);
  expect(rig.alpaca.calls("/v2/clock")).toHaveLength(2);
  expect(rig.feed.catalogue.get("NEWCO")).toEqual({
    symbol: "NEWCO",
    name: "New Listing Example Inc.",
  });

  now = Date.parse("2025-06-25T13:30:00Z");
  await vi.advanceTimersByTimeAsync(STATUS_CHECK_INTERVAL_MS);
  expect(changes).toEqual(["closed", "open"]);
  expect(rig.alpaca.calls("/v2/assets")).toHaveLength(3);
});

test("the catalogue holds active, tradable US equities and a default list", async () => {
  rig = await startAlpaca();
  const { catalogue } = rig.feed;
  const assets = rig.alpaca.calls("/v2/assets")[0];

  expect(assets?.searchParams.get("status")).toBe("active");
  expect(assets?.searchParams.get("asset_class")).toBe("us_equity");
  expect(catalogue.all().map((entry) => entry.symbol)).toEqual(["AAPL", "MSFT", "SPY"]);
  expect(catalogue.get("NTDOY")).toBeUndefined();
  expect(catalogue.get("XYZQ")).toBeUndefined();
  expect(catalogue.defaultList()).toEqual(expect.arrayContaining(["AAPL", "MSFT"]));
  expect(catalogue.defaultList().every((symbol) => catalogue.get(symbol))).toBe(true);
});

test("a failed catalogue refresh keeps the previous list", async () => {
  rig = await startAlpaca();
  rig.alpaca.failing.set("/v2/assets", 503);
  await rig.feed.catalogue.refresh();
  expect(rig.feed.catalogue.get("AAPL")).toBeDefined();
  expect(rig.warnings).toContain("Alpaca asset list refresh failed, keeping the previous list");
});

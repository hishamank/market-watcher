import type { Quote } from "@mini/contracts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { STATUS_CHECK_INTERVAL_MS } from "./config.ts";
import {
  AFTER_HOURS_NOW,
  type AlpacaRig,
  authenticate,
  SESSION_NOW,
  startAlpaca,
} from "./testing.ts";

const NEXT_SESSION_NOW = Date.parse("2025-06-25T13:31:00Z");
const SESSION_CLOSE = Date.parse("2025-06-24T20:00:00Z");

let rig: AlpacaRig | undefined;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"],
  });
});

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
  vi.useRealTimers();
});

async function watchAapl(current: AlpacaRig): Promise<Quote[]> {
  current.feed.live.subscribe(["AAPL"]);
  await current.feed.live.snapshot(["AAPL"]);
  authenticate(current.sockets.last());
  const quotes: Quote[] = [];
  current.feed.live.onQuote((quote) => quotes.push(quote));
  return quotes;
}

async function crossInto(current: AlpacaRig, time: number): Promise<void> {
  current.alpaca.failing.set("/v2/stocks/snapshots", 500);
  vi.setSystemTime(time);
  await vi.advanceTimersByTimeAsync(STATUS_CHECK_INTERVAL_MS);
}

test("a trade after a failed open resync waits for the new session's baseline", async () => {
  vi.setSystemTime(AFTER_HOURS_NOW);
  rig = await startAlpaca((alpaca) => (alpaca.clock = "after-hours"), { now: () => Date.now() });
  const quotes = await watchAapl(rig);
  await crossInto(rig, NEXT_SESSION_NOW);
  expect(rig.warnings).toContain("Alpaca resync after status change failed");

  rig.sockets.last().push("stream-trade-next-session.json");
  expect(quotes).toEqual([]);
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toEqual([]);

  rig.alpaca.failing.clear();
  await vi.advanceTimersByTimeAsync(10_000);
  expect(quotes.some((quote) => quote.previousClose === "200.30")).toBe(false);
  expect(quotes.at(-1)).toEqual({
    symbol: "AAPL",
    price: "205.00",
    change: "3.50",
    changePercent: "1.74",
    previousClose: "201.50",
    timestamp: Date.parse("2025-06-25T13:31:00.250Z"),
  });
});

test("a failed close resync is retried, and the last trade is not served as the close", async () => {
  vi.setSystemTime(SESSION_NOW);
  rig = await startAlpaca(undefined, { now: () => Date.now() });
  const quotes = await watchAapl(rig);
  rig.sockets.last().push("stream-trades.json");
  expect(quotes.at(-1)?.price).toBe("202.13");
  await crossInto(rig, SESSION_CLOSE + 1_000);

  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toEqual([]);

  rig.alpaca.failing.clear();
  await vi.advanceTimersByTimeAsync(10_000);
  const close = {
    symbol: "AAPL",
    price: "201.50",
    change: "1.20",
    changePercent: "0.60",
    previousClose: "200.30",
    timestamp: SESSION_CLOSE,
  };
  expect(quotes.at(-1)).toEqual(close);
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toEqual([close]);
});

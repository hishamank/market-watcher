import type { Quote } from "@mini/contracts";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { POLL_INTERVAL_MS, RECONNECT_BASE_MS, STREAM_SYMBOL_LIMIT } from "./config.ts";
import {
  AFTER_HOURS_NOW,
  type AlpacaRig,
  authenticate,
  SESSION_NOW,
  startAlpaca,
} from "./testing.ts";

let rig: AlpacaRig | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
});

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
  vi.useRealTimers();
});

const symbols = (count: number) =>
  Array.from({ length: count }, (_, index) => `S${String(index + 1).padStart(2, "0")}`);

function collect(current: AlpacaRig): Quote[] {
  const quotes: Quote[] = [];
  current.feed.live.onQuote((quote) => quotes.push(quote));
  return quotes;
}

test("streams the first 30 symbols and polls the rest in one batch every 5 s", async () => {
  rig = await startAlpaca();
  const quotes = collect(rig);
  rig.feed.live.subscribe(symbols(35));
  const socket = rig.sockets.last();
  authenticate(socket);

  expect(socket.sent[0]).toEqual({ action: "auth", key: "test-key-id", secret: "test-secret-key" });
  expect(socket.trades()).toEqual(symbols(STREAM_SYMBOL_LIMIT));

  await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
  const polls = rig.alpaca.calls("/v2/stocks/snapshots").slice(1);
  expect(polls).toHaveLength(1);
  expect(polls[0]?.searchParams.get("symbols")).toBe("S31,S32,S33,S34,S35");
  expect(polls[0]?.searchParams.get("feed")).toBe("iex");
  expect(quotes.map((quote) => quote.symbol)).toEqual(["S31", "S32", "S33", "S34", "S35"]);
  expect(quotes[0]).toEqual({
    symbol: "S31",
    price: "201.56",
    change: "1.26",
    changePercent: "0.63",
    previousClose: "200.30",
    timestamp: Date.parse("2025-06-24T18:15:21.670Z"),
  });

  await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
  expect(rig.alpaca.calls("/v2/stocks/snapshots")).toHaveLength(3);
  expect(quotes).toHaveLength(5);
});

test("promotes a polled symbol when it gains watchers, and incumbents keep ties", async () => {
  rig = await startAlpaca();
  const live = rig.feed.live;
  live.subscribe(symbols(31));
  const socket = rig.sockets.last();
  authenticate(socket);
  expect(live.streamed().has("S31")).toBe(false);

  live.watchCount?.("S31", 2);
  expect(live.streamed().has("S31")).toBe(true);
  expect(live.streamed().has("S30")).toBe(false);
  expect(socket.sent.slice(-2)).toEqual([
    { action: "unsubscribe", trades: ["S30"] },
    { action: "subscribe", trades: ["S31"] },
  ]);

  live.watchCount?.("S31", 1);
  expect(live.streamed().has("S31")).toBe(true);

  live.unsubscribe(["S31"]);
  expect(socket.trades()).toEqual(symbols(30));
  expect(live.streamed().size).toBe(STREAM_SYMBOL_LIMIT);
});

test("trades become rounded quotes during the session and are dropped after hours", async () => {
  let now = SESSION_NOW;
  rig = await startAlpaca(undefined, { now: () => now });
  const quotes = collect(rig);
  rig.feed.live.subscribe(["AAPL"]);
  await rig.feed.live.snapshot(["AAPL"]);
  authenticate(rig.sockets.last());
  quotes.length = 0;

  rig.sockets.last().push("stream-trades.json");
  expect(quotes).toEqual([
    {
      symbol: "AAPL",
      price: "202.13",
      change: "1.83",
      changePercent: "0.91",
      previousClose: "200.30",
      timestamp: Date.parse("2025-06-24T18:16:44.208Z"),
    },
  ]);

  now = AFTER_HOURS_NOW;
  rig.sockets.last().push("stream-trade-after-hours.json");
  expect(quotes).toHaveLength(1);
});

test("reconnects with backoff and resubscribes the whole set after auth", async () => {
  rig = await startAlpaca();
  rig.feed.live.subscribe(["AAPL", "MSFT"]);
  const first = rig.sockets.last();
  authenticate(first);
  first.push("stream-auth-failed.json");
  first.push("stream-symbol-limit.json");
  first.drop();

  await vi.advanceTimersByTimeAsync(RECONNECT_BASE_MS - 1);
  expect(rig.sockets.all).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  const second = rig.sockets.last();
  expect(second).not.toBe(first);
  expect(second.url).toBe("wss://stream.test/v2/iex");

  authenticate(second);
  expect(second.trades()).toEqual(["AAPL", "MSFT"]);
  expect(rig.warnings).toContain("Alpaca stream sent an error");
});

test("a failed snapshot rejects, and a reused one costs no request", async () => {
  rig = await startAlpaca();
  const before = rig.alpaca.calls("/v2/stocks/snapshots").length;
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toHaveLength(1);
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toHaveLength(1);
  expect(rig.alpaca.calls("/v2/stocks/snapshots")).toHaveLength(before + 1);

  rig.alpaca.failing.set("/v2/stocks/snapshots", 500);
  await expect(rig.feed.live.snapshot(["MSFT"])).rejects.toThrow("HTTP 500");
});

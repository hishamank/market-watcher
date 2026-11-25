import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { UPSTREAM_RETRY_MS } from "../../hub/limits.ts";
import { createQuoteBook } from "../../hub/quote-book.ts";
import type { Fetch } from "./http.ts";
import { type AlpacaRig, type FakeAlpaca, SESSION_NOW, startAlpaca } from "./testing.ts";

const SLOW_BATCH_MS = 6_000;
const MINUTE_MS = 60_000;
const SYMBOLS = Array.from({ length: 50 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`);

interface Call {
  readonly at: number;
  readonly status: number;
}

let rig: AlpacaRig | undefined;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"],
  });
  vi.setSystemTime(SESSION_NOW);
});

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
  vi.useRealTimers();
});

async function startSlowAlpaca(): Promise<{ alpaca: FakeAlpaca; calls: Call[] }> {
  const calls: Call[] = [];
  const state: { alpaca?: FakeAlpaca; slow: boolean } = { slow: false };
  const fetch: Fetch = async (url, init) => {
    if (state.alpaca === undefined) throw new Error("fake Alpaca is not ready");
    const response = await state.alpaca.fetch(url, init);
    if (new URL(url).pathname === "/v2/stocks/snapshots") {
      calls.push({ at: Date.now(), status: response.status });
    }
    if (state.slow) await new Promise((resolve) => setTimeout(resolve, SLOW_BATCH_MS));
    return response;
  };
  rig = await startAlpaca((alpaca) => (state.alpaca = alpaca), { fetch, now: () => Date.now() });
  state.slow = true;
  calls.length = 0;
  return { alpaca: rig.alpaca, calls };
}

async function watchLikeTheHub(current: AlpacaRig, seconds: number): Promise<void> {
  const book = createQuoteBook(
    current.feed.live,
    () => true,
    () => undefined,
  );
  current.feed.live.subscribe(SYMBOLS);
  void book.fetch(SYMBOLS);
  for (let second = 0; second < seconds; second += 1) {
    await vi.advanceTimersByTimeAsync(UPSTREAM_RETRY_MS);
    void book.refresh(SYMBOLS.filter((symbol) => !book.latest.has(symbol)));
  }
}

function busiestMinute(calls: readonly Call[]): number {
  const counts = calls.map(
    (call) => calls.filter((other) => other.at >= call.at && other.at < call.at + MINUTE_MS).length,
  );
  return Math.max(0, ...counts);
}

test("50 symbols whose slow batches fail stay inside Alpaca Basic's 200 calls a minute", async () => {
  const { alpaca, calls } = await startSlowAlpaca();
  alpaca.failing.set("/v2/stocks/snapshots", 500);

  await watchLikeTheHub(rig as AlpacaRig, 66);

  expect(busiestMinute(calls)).toBeLessThan(200);
  expect(calls.length).toBeLessThanOrEqual(8);
});

test("a 429 pauses every snapshot path for a full minute", async () => {
  const { alpaca, calls } = await startSlowAlpaca();
  alpaca.failing.set("/v2/stocks/snapshots", 429);

  await watchLikeTheHub(rig as AlpacaRig, 80);

  expect(calls[0]).toEqual({ at: SESSION_NOW, status: 429 });
  expect(calls.filter((call) => call.at < SESSION_NOW + SLOW_BATCH_MS + MINUTE_MS)).toHaveLength(1);
  expect(calls.length).toBeGreaterThan(1);
});

test("at most 180 data requests reach Alpaca in a minute, and the next minute gets more", async () => {
  rig = await startAlpaca(undefined, { now: () => Date.now() });
  const calls = () => rig?.alpaca.calls("/v2/stocks/snapshots").length ?? 0;
  expect(calls()).toBe(1);

  const symbols = Array.from({ length: 200 }, (_, index) => `C${index + 1}`);
  const results = await Promise.allSettled(symbols.map((s) => rig?.feed.live.snapshot([s])));
  expect(calls()).toBe(180);
  expect(results.filter((result) => result.status === "rejected")).toHaveLength(21);

  vi.setSystemTime(SESSION_NOW + MINUTE_MS);
  await expect(rig.feed.live.snapshot(["NEXT"])).resolves.toHaveLength(1);
  expect(calls()).toBe(181);
});

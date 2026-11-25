import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AlpacaBudgetError } from "./budget.ts";
import { BACKOFF_BASE_MS, REQUEST_TIMEOUT_MS } from "./config.ts";
import type { Fetch } from "./http.ts";
import { type AlpacaRig, type FakeAlpaca, SESSION_NOW, startAlpaca } from "./testing.ts";

interface Line {
  alpaca?: FakeAlpaca;
  hang: boolean;
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

function hangingFetch(line: Line): Fetch {
  return (url, init) => {
    if (line.alpaca === undefined) return Promise.reject(new Error("fake Alpaca is not ready"));
    if (!line.hang) return line.alpaca.fetch(url, init);
    const signal = init.signal ?? undefined;
    line.alpaca.requests.push({ url: new URL(url), signal });
    return new Promise((_resolve, reject) => {
      if (signal?.aborted) reject(signal.reason);
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  };
}

async function startHanging(): Promise<{ line: Line; rig: AlpacaRig }> {
  const line: Line = { hang: false };
  const started = await startAlpaca((alpaca) => (line.alpaca = alpaca), {
    fetch: hangingFetch(line),
    now: () => Date.now(),
  });
  rig = started;
  return { line, rig: started };
}

test("a request Alpaca never answers fails at 4 s, frees its symbols and starts the backoff", async () => {
  const { line, rig: current } = await startHanging();
  const calls = (): number => current.alpaca.calls("/v2/stocks/snapshots").length;
  current.feed.live.subscribe(["MSFT"]);
  line.hang = true;
  let outcome: unknown;
  void current.feed.live.resync().then(
    () => (outcome = "resolved"),
    (err: unknown) => (outcome = err),
  );

  await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
  expect(outcome).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(outcome).toBeInstanceOf(Error);
  expect(outcome).not.toBeInstanceOf(AlpacaBudgetError);

  line.hang = false;
  const before = calls();
  await expect(current.feed.live.resync()).rejects.toBeInstanceOf(AlpacaBudgetError);
  expect(calls()).toBe(before);
  await vi.advanceTimersByTimeAsync(BACKOFF_BASE_MS);
  await expect(current.feed.live.resync()).resolves.toBeUndefined();
  expect(calls()).toBe(before + 1);
});

test("a caller's abort rejects at once and starts no backoff", async () => {
  const { line, rig: current } = await startHanging();
  line.hang = true;
  const controller = new AbortController();
  const request = current.feed.history.history({
    symbol: "AAPL",
    range: "1W",
    now: SESSION_NOW,
    signal: controller.signal,
  });
  controller.abort(new Error("superseded"));
  await expect(request).rejects.toThrow("superseded");

  line.hang = false;
  await expect(current.feed.live.snapshot(["MSFT"])).resolves.toHaveLength(1);
});

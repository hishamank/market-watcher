import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AlpacaBudgetError } from "./budget.ts";
import { BUDGET_WINDOW_MS, HISTORY_REQUEST_BUDGET, REQUEST_BUDGET } from "./config.ts";
import { type AlpacaRig, SESSION_NOW, startAlpaca } from "./testing.ts";

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

const dataCalls = (current: AlpacaRig): number =>
  current.alpaca.calls("/v2/stocks/bars").length +
  current.alpaca.calls("/v2/stocks/snapshots").length;

async function askHistoryUntilRefused(current: AlpacaRig, attempts: number): Promise<unknown[]> {
  const refusals: unknown[] = [];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await current.feed.history
      .history({ symbol: "AAPL", range: "1Y", now: Date.now() })
      .catch((err: unknown) => refusals.push(err));
  }
  return refusals;
}

test("history demand stops at its share and quote requests are still admitted", async () => {
  rig = await startAlpaca(undefined, { now: () => Date.now() });
  const before = dataCalls(rig);

  const refusals = await askHistoryUntilRefused(rig, 120);

  expect(dataCalls(rig) - before).toBe(HISTORY_REQUEST_BUDGET);
  expect(refusals.length).toBeGreaterThan(0);
  expect(refusals.every((err) => err instanceof AlpacaBudgetError)).toBe(true);
  expect(HISTORY_REQUEST_BUDGET).toBeLessThan(REQUEST_BUDGET);

  const snapshotsBefore = rig.alpaca.calls("/v2/stocks/snapshots").length;
  await expect(rig.feed.live.snapshot(["AAPL"])).resolves.toHaveLength(1);
  expect(rig.alpaca.calls("/v2/stocks/snapshots").length).toBe(snapshotsBefore + 1);
});

test("history is served again once the minute has passed", async () => {
  rig = await startAlpaca(undefined, { now: () => Date.now() });
  await askHistoryUntilRefused(rig, 120);
  const request = { symbol: "AAPL", range: "1Y", now: Date.now() } as const;
  await expect(rig.feed.history.history(request)).rejects.toBeInstanceOf(AlpacaBudgetError);

  await vi.advanceTimersByTimeAsync(BUDGET_WINDOW_MS);

  await expect(rig.feed.history.history({ ...request, now: Date.now() })).resolves.toMatchObject({
    previousClose: expect.any(String),
  });
});

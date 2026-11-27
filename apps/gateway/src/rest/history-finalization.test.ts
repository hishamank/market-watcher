import { HistoryResponseSchema } from "@mini/contracts";
import { afterEach, expect, it } from "vitest";
import { FIXED_NOW, startRestGateway, type RestGateway } from "./testing.ts";

const active: RestGateway[] = [];
afterEach(async () => {
  for (const gateway of active.splice(0)) await gateway.close();
});
async function launch(options: Parameters<typeof startRestGateway>[0] = {}) {
  const gateway = await startRestGateway(options);
  active.push(gateway);
  return gateway;
}
async function history(gateway: RestGateway) {
  return HistoryResponseSchema.parse(
    await (await gateway.get("/stocks/AAPL/history?range=1D")).json(),
  );
}
const close = FIXED_NOW + 30_000;
const session = { open: FIXED_NOW - 60_000, close };
const naturalCalendar = () => ({
  status: (time: number): "open" | "closed" => (time < close ? "open" : "closed"),
  session: () => session,
  onStatusChange: () => () => {},
});

it("finalizes fresh pre-close history at natural close and caches the finalized result", async () => {
  const gateway = await launch({
    wrapCalendar: naturalCalendar,
    wrapHistory: () => ({
      history: async ({ now }) => ({
        session,
        previousClose: "99.00",
        bars: [{ time: Math.min(now, close), close: now < close ? "100.00" : "105.00" }],
      }),
    }),
  });
  expect((await history(gateway)).bars.at(-1)?.close).toBe("100.00");
  gateway.setNow(close);
  expect((await history(gateway)).bars.at(-1)?.close).toBe("105.00");
  gateway.advanceMs(3_600_000);
  expect((await history(gateway)).bars.at(-1)?.close).toBe("105.00");
  expect(gateway.historyCalls).toHaveLength(2);
});

it("refreshes at forced simulator close and marks failure fallback explicitly", async () => {
  const gateway = await launch();
  const original = await history(gateway);
  gateway.advanceMs(20_000);
  gateway.feed.updateSettings({ forceClosed: true, historyFailureRate: 1 });
  const fallback = await history(gateway);
  expect(fallback.ageMs).toBe(20_000);
  expect(fallback.bars).toEqual(original.bars);
  gateway.feed.updateSettings({ historyFailureRate: 0 });
  const finalized = await history(gateway);
  expect(finalized.ageMs).toBeUndefined();
  expect(gateway.historyCalls).toHaveLength(3);
  gateway.advanceMs(3_600_000);
  expect((await history(gateway)).bars).toEqual(finalized.bars);
  expect(gateway.historyCalls).toHaveLength(3);
});

it("does not cache an in-flight pre-close response as finalized data", async () => {
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  const gateway = await launch({
    wrapCalendar: naturalCalendar,
    wrapHistory: () => ({
      history: async ({ now }) => {
        if (now < close) {
          started.resolve();
          await gate.promise;
        }
        return {
          session,
          previousClose: "99.00",
          bars: [{ time: Math.min(now, close), close: now < close ? "100.00" : "105.00" }],
        };
      },
    }),
  });
  const pending = gateway.get("/stocks/AAPL/history?range=1D");
  await started.promise;
  gateway.setNow(close);
  gate.resolve();
  expect((await pending).status).toBe(503);
  expect((await history(gateway)).bars.at(-1)?.close).toBe("105.00");
  expect(gateway.historyCalls).toHaveLength(2);
});

it("returns explicit fallback age when a refresh with cached history crosses close", async () => {
  const gate = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  let calls = 0;
  const gateway = await launch({
    initialNow: FIXED_NOW - 150_000,
    wrapCalendar: naturalCalendar,
    wrapHistory: () => ({
      history: async ({ now }) => {
        calls += 1;
        if (calls === 2) {
          started.resolve();
          await gate.promise;
        }
        return {
          session,
          previousClose: "99.00",
          bars: [
            {
              time: Math.max(session.open, Math.min(now, close)),
              close: now < close ? "100.00" : "105.00",
            },
          ],
        };
      },
    }),
  });
  const original = await history(gateway);
  gateway.setNow(FIXED_NOW);
  const pending = gateway.get("/stocks/AAPL/history?range=1D");
  await started.promise;
  gateway.setNow(close);
  gate.resolve();
  const fallback = HistoryResponseSchema.parse(await (await pending).json());
  expect(fallback.ageMs).toBe(180_000);
  expect(fallback.bars).toEqual(original.bars);
  expect((await history(gateway)).bars.at(-1)?.close).toBe("105.00");
});

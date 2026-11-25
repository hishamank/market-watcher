import { HistoryResponseSchema } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { FIXED_NOW, type RestGateway, startRestGateway } from "./testing.ts";

const active: RestGateway[] = [];

async function launch(options?: Parameters<typeof startRestGateway>[0]): Promise<RestGateway> {
  const gateway = await startRestGateway(options);
  active.push(gateway);
  return gateway;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

afterEach(async () => {
  while (active.length > 0) {
    await active.pop()?.close();
  }
});

describe("history cache in-flight sharing", () => {
  it("shares one source call across ten concurrent identical requests", async () => {
    const gate = deferred<void>();
    const gw = await launch({
      wrapHistory: (base) => ({
        async history(request) {
          await gate.promise;
          return base.history(request);
        },
      }),
    });

    const pending = Array.from({ length: 10 }, () => gw.get("/stocks/AAPL/history?range=1D"));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(gw.historyCalls).toHaveLength(1);

    gate.resolve();
    const responses = await Promise.all(pending);
    expect(gw.historyCalls).toHaveLength(1);
    const bodies = await Promise.all(
      responses.map(async (res) => {
        expect(res.status).toBe(200);
        return HistoryResponseSchema.parse(await res.json());
      }),
    );
    for (const body of bodies) {
      expect(body).toEqual(bodies[0]);
    }
  });
});

describe("history cache stale-while-revalidate", () => {
  it("serves an expired entry inside the SWR window at once and refreshes in the background", async () => {
    const refreshGate = deferred<void>();
    let callCount = 0;
    const gw = await launch({
      wrapHistory: (base) => ({
        async history(request) {
          callCount += 1;
          if (callCount === 2) {
            await refreshGate.promise;
          }
          return base.history(request);
        },
      }),
    });

    const first = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(gw.historyCalls).toHaveLength(1);

    gw.advanceMs(59_000);
    const fresh = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(gw.historyCalls).toHaveLength(1);
    expect(fresh).toEqual(first);

    gw.advanceMs(31_000);
    const swr = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(swr).toEqual(first);
    expect(swr.ageMs).toBeUndefined();
    expect(gw.historyCalls).toHaveLength(2);

    refreshGate.resolve();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const refreshed = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(gw.historyCalls).toHaveLength(2);
    expect(refreshed.bars.at(-1)?.time).toBe(FIXED_NOW + 90_000);
    expect(refreshed.ageMs).toBeUndefined();
  });

  it("refreshes entries past the SWR window before responding", async () => {
    const gw = await launch();
    await gw.get("/stocks/AAPL/history?range=1D");
    gw.advanceMs(120_000);

    const body = HistoryResponseSchema.parse(
      await (await gw.get("/stocks/AAPL/history?range=1D")).json(),
    );
    expect(gw.historyCalls).toHaveLength(2);
    expect(body.bars.at(-1)?.time).toBe(FIXED_NOW + 120_000);
    expect(body.ageMs).toBeUndefined();
  });
});

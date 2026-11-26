import { afterEach, expect, test, vi } from "vitest";
import { fakeTimers, type Gateway, startGateway } from "../../socket/testing.ts";
import type { AlpacaFeed } from "./index.ts";
import {
  AFTER_HOURS_NOW,
  type AlpacaRig,
  authenticate,
  fixture,
  SESSION_NOW,
  startAlpaca,
} from "./testing.ts";

let gateway: Gateway<AlpacaFeed> | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway?.feed.close();
  gateway = undefined;
});

async function startLive(rig: AlpacaRig): Promise<Gateway<AlpacaFeed>> {
  gateway = await startGateway(rig.feed, false, "live", rig.now);
  return gateway;
}

test("at the close watchers and new subscribers receive last-known quotes until recovery", async () => {
  vi.useFakeTimers(fakeTimers());
  try {
    let time = SESSION_NOW;
    const rig = await startAlpaca(undefined, { now: () => time });
    const live = await startLive(rig);
    const alice = await live.connect();
    alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
    expect((await alice.next("snapshot")).quotes).toMatchObject([{ price: "201.56" }]);
    authenticate(rig.sockets.last());
    rig.sockets.last().push("stream-trades.json");
    const close = Date.parse("2025-06-24T20:00:00Z");
    time = close;
    rig.alpaca.clock = "after-hours";
    rig.alpaca.failing.set("/v2/stocks/snapshots", 500);
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await alice.next("quotes")).quotes).toMatchObject([{ lastKnown: true }]);
    const bob = await live.connect();
    expect(await bob.next("welcome")).toMatchObject({ marketStatus: "closed" });
    bob.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
    expect(await bob.next("snapshot")).toMatchObject({
      requestId: 2,
      quotes: [{ lastKnown: true }],
    });
    expect(bob.all("error")).toEqual([]);
    for (let second = 0; second < 10; second += 1) {
      time += 1_000;
      await vi.advanceTimersByTimeAsync(1_000);
    }
    for (const [client, ticks] of [
      [alice, 1],
      [bob, 0],
    ] as const) {
      await client.settle();
      expect(
        client
          .all("quotes")
          .flatMap((message) => message.quotes)
          .filter((quote) => quote.lastKnown),
      ).toHaveLength(ticks);
    }
    rig.alpaca.failing.clear();
    time += 60_001;
    await vi.advanceTimersByTimeAsync(1_250);
    for (const client of [alice, bob]) {
      await client.settle();
      const recovered = client.all("quotes").at(-1)?.quotes;
      expect(recovered).toMatchObject([{ price: "201.50", timestamp: close }]);
      expect(recovered?.[0]).not.toHaveProperty("lastKnown");
    }
  } finally {
    vi.useRealTimers();
  }
});

test("REST serves held quotes across a failed close, including an unwatched symbol", async () => {
  let time = SESSION_NOW;
  const rig = await startAlpaca(undefined, { now: () => time });
  const live = await startLive(rig);
  expect((await live.app.inject("/stocks/AAPL")).statusCode).toBe(200);
  time = AFTER_HOURS_NOW;
  rig.alpaca.failing.set("/v2/stocks/snapshots", 500);
  const detail = await live.app.inject("/stocks/AAPL");
  expect(detail.statusCode).toBe(200);
  expect(detail.json().stock.quote.lastKnown).toBe(true);
  const list = await live.app.inject("/stocks?symbols=AAPL");
  expect(list.statusCode).toBe(200);
  expect(list.json().stocks[0].quote.lastKnown).toBe(true);
  for (const path of ["/stocks/MSFT", "/stocks?symbols=MSFT"]) {
    expect((await live.app.inject(path)).statusCode).toBe(503);
  }
});

test("a healthy close never publishes a last-known quote", async () => {
  vi.useFakeTimers(fakeTimers());
  try {
    const close = Date.parse("2025-06-24T20:00:00Z");
    let time = close - 2_000;
    const rig = await startAlpaca(undefined, { now: () => time });
    const live = await startLive(rig);
    const client = await live.connect();
    client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
    await client.next("snapshot");
    expect((await live.app.inject("/stocks/AAPL")).statusCode).toBe(200);
    time = close + 100;
    rig.alpaca.clock = "after-hours";
    const detail = await live.app.inject("/stocks/AAPL");
    expect(detail.statusCode).toBe(503);
    expect(detail.json().stock?.quote?.lastKnown).toBeUndefined();
    const bob = await live.connect();
    bob.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
    expect((await bob.next("snapshot")).quotes.every((quote) => !quote.lastKnown)).toBe(true);
    await vi.advanceTimersByTimeAsync(1_000);
    await client.settle();
    expect(
      client
        .all("quotes")
        .flatMap((message) => message.quotes)
        .every((quote) => !quote.lastKnown),
    ).toBe(true);
    time = close + 5_001;
    await vi.advanceTimersByTimeAsync(1_000);
    const tick = await client.next("quotes");
    expect(tick.quotes[0]?.timestamp).toBe(Date.parse("2025-06-24T20:00:00Z"));
    expect(
      client
        .all("quotes")
        .flatMap((message) => message.quotes)
        .every((quote) => !quote.lastKnown),
    ).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});

test("a snapshot crossing the close is discarded without marking REST or watchers", async () => {
  vi.useFakeTimers(fakeTimers());
  try {
    const close = Date.parse("2025-06-24T20:00:00Z");
    let time = close - 10_000;
    const rig = await startAlpaca(undefined, { now: () => time });
    const live = await startLive(rig);
    const client = await live.connect();
    client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
    await client.next("snapshot");
    time = close - 100;
    rig.alpaca.routes.set("/v2/stocks/snapshots", () => {
      time = close + 100;
      return fixture("snapshots.json");
    });
    expect((await live.app.inject("/stocks/AAPL")).statusCode).toBe(503);
    await vi.advanceTimersByTimeAsync(1_000);
    await client.settle();
    expect(
      client
        .all("quotes")
        .flatMap((message) => message.quotes)
        .every((quote) => !quote.lastKnown),
    ).toBe(true);
    rig.alpaca.routes.clear();
    time = close + 5_101;
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await client.next("quotes")).quotes).toMatchObject([{ timestamp: close }]);
  } finally {
    vi.useRealTimers();
  }
});

test("a failure before the close does not mark a skipped refresh after the close", async () => {
  const close = Date.parse("2025-06-24T20:00:00Z");
  let time = close - 10_000;
  const rig = await startAlpaca(undefined, { now: () => time });
  const live = await startLive(rig);
  expect((await live.app.inject("/stocks/AAPL")).statusCode).toBe(200);
  time = close - 1_000;
  rig.alpaca.failing.set("/v2/stocks/snapshots", 500);
  expect((await live.app.inject("/stocks/AAPL")).json().stock.quote.lastKnown).toBeUndefined();
  time = close + 100;
  rig.alpaca.failing.clear();
  expect((await live.app.inject("/stocks/AAPL")).statusCode).toBe(503);
});

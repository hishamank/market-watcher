import { afterEach, expect, test, vi } from "vitest";
import { buildApp } from "../../app.ts";
import { type Gateway, startGateway } from "../../socket/testing.ts";
import type { AlpacaFeed } from "./index.ts";
import {
  AFTER_HOURS_NOW,
  type AlpacaRig,
  assetsFor,
  authenticate,
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
  gateway = await startGateway(rig.feed, false, "live");
  return gateway;
}

test("an upstream snapshot failure answers unavailable, then the first quote ticks in", async () => {
  const startedAt = Date.now();
  const rig = await startAlpaca(undefined, { now: () => SESSION_NOW + Date.now() - startedAt });
  const live = await startLive(rig);
  const client = await live.connect();
  rig.alpaca.failing.set("/v2/stocks/snapshots", 500);

  client.send({ type: "subscribe", requestId: 7, symbols: ["MSFT"] });
  await expect(client.next("error")).resolves.toMatchObject({
    code: "unavailable",
    requestId: 7,
    symbols: ["MSFT"],
  });
  await expect(client.next("snapshot")).resolves.toEqual({
    type: "snapshot",
    requestId: 7,
    quotes: [],
  });

  rig.alpaca.failing.clear();
  const tick = await client.next("quotes");
  expect(tick.quotes).toMatchObject([{ symbol: "MSFT", price: "490.10", previousClose: "486.00" }]);
}, 15_000);

test("welcome says Live and Market closed after hours, with the last close as the price", async () => {
  const rig = await startAlpaca((alpaca) => (alpaca.clock = "after-hours"), {
    now: () => AFTER_HOURS_NOW,
  });
  const live = await startLive(rig);
  const client = await live.connect();

  await expect(client.next("welcome")).resolves.toMatchObject({
    feedMode: "live",
    marketStatus: "closed",
  });
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  const snapshot = await client.next("snapshot");
  expect(snapshot.quotes).toEqual([
    {
      symbol: "AAPL",
      price: "201.50",
      change: "1.20",
      changePercent: "0.60",
      previousClose: "200.30",
      timestamp: Date.parse("2025-06-24T20:00:00Z"),
    },
  ]);
});

test("a second watcher promotes a polled symbol to the stream through the hub", async () => {
  const symbols = Array.from({ length: 31 }, (_, index) => `T${index + 1}`);
  const rig = await startAlpaca((alpaca) => (alpaca.assets = assetsFor(symbols)));
  const live = await startLive(rig);
  const alice = await live.connect();
  const bob = await live.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols });
  await alice.next("snapshot");
  authenticate(rig.sockets.last());
  expect(rig.sockets.last().trades()).toEqual(symbols.slice(0, 30).sort());

  bob.send({ type: "subscribe", requestId: 2, symbols: ["T31"] });
  await bob.next("snapshot");
  expect(rig.feed.live.streamed().has("T31")).toBe(true);
  expect(rig.feed.live.streamed().has("T30")).toBe(false);
  expect(rig.sockets.last().trades()).toContain("T31");

  bob.socket.close();
  await vi.waitFor(() => expect(rig.sockets.last().trades()).toContain("T31"));
  alice.send({ type: "unsubscribe", symbols: ["T31"] });
  await vi.waitFor(() => expect(rig.sockets.last().trades()).toContain("T30"));
});

test("REST after hours serves Live, Market closed, the last close and the last session", async () => {
  const rig = await startAlpaca((alpaca) => (alpaca.clock = "after-hours"), {
    now: () => AFTER_HOURS_NOW,
  });
  const app = buildApp({
    feed: rig.feed,
    feedMode: "live",
    allowedOrigins: new Set(),
    logger: false,
    now: () => AFTER_HOURS_NOW,
  });
  try {
    const list = (await app.inject("/stocks")).json();
    expect(list).toMatchObject({ feedMode: "live", marketStatus: "closed" });
    expect(list.stocks).toContainEqual(
      expect.objectContaining({
        symbol: "AAPL",
        quote: expect.objectContaining({ price: "201.50" }),
      }),
    );
    const history = (await app.inject("/stocks/AAPL/history?range=1D")).json();
    expect(history).toMatchObject({
      feedMode: "live",
      marketStatus: "closed",
      barSize: "5m",
      previousClose: "200.30",
      session: {
        open: Date.parse("2025-06-24T13:30:00Z"),
        close: Date.parse("2025-06-24T20:00:00Z"),
      },
    });
    expect(history.bars).toHaveLength(3);
  } finally {
    await app.close();
    rig.feed.close();
  }
});

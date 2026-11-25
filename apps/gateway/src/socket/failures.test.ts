import { afterEach, expect, test, vi } from "vitest";
import type { LiveFeed } from "../feeds/types.ts";
import { createFakeFeed, type FakeFeed } from "../hub/fake-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

function withLive(feed: FakeFeed, overrides: Partial<LiveFeed>): FakeFeed {
  return { ...feed, live: { ...feed.live, ...overrides } };
}

const RETRY_WAIT = { timeout: 3_000 };

test("a sync start failure still answers with quotes and is retried until it starts", async () => {
  const base = createFakeFeed();
  let fail = true;
  const feed = withLive(base, {
    subscribe(symbols) {
      if (!fail) {
        base.live.subscribe(symbols);
        return;
      }
      base.live.subscribe(symbols.slice(0, 1));
      throw new Error("upstream subscribe failed");
    },
  });
  gateway = await startGateway(feed);
  const client = await gateway.connect();

  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
  const snapshot = await client.next("snapshot");
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["AAPL", "MSFT"]);
  expect(client.all("error")).toEqual([]);
  expect(base.upstream()).toEqual(["AAPL"]);

  fail = false;
  await vi.waitFor(() => expect(base.upstream()).toEqual(["AAPL", "MSFT"]), RETRY_WAIT);
  feed.tick("MSFT", "101.00");
  await expect(client.next("quotes")).resolves.toMatchObject({ quotes: [{ symbol: "MSFT" }] });
});

test("an async start failure answers every watcher and leaves other streams alone", async () => {
  const base = createFakeFeed();
  let failMsft = true;
  const feed = withLive(base, {
    subscribe(symbols) {
      if (failMsft && symbols.includes("MSFT")) {
        return Promise.reject(new Error("async subscribe failed")) as unknown as void;
      }
      base.live.subscribe(symbols);
    },
  });
  gateway = await startGateway(feed);
  const alice = await gateway.connect();
  const bob = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
  await alice.next("snapshot");

  bob.send({ type: "subscribe", requestId: 3, symbols: ["AAPL", "MSFT"] });
  const snapshot = await bob.next("snapshot");
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["AAPL", "MSFT"]);
  expect(bob.all("error")).toEqual([]);
  expect(base.upstream()).toEqual(["AAPL"]);

  failMsft = false;
  await vi.waitFor(() => expect(base.upstream()).toEqual(["AAPL", "MSFT"]), RETRY_WAIT);
});

test("failed unsubscribe and close stops are retried until upstream converges", async () => {
  const base = createFakeFeed();
  let mode: "ok" | "sync" | "async" = "ok";
  const feed = withLive(base, {
    unsubscribe(symbols) {
      if (mode === "sync") {
        throw new Error("sync unsubscribe failed");
      }
      if (mode === "async") {
        return Promise.reject(new Error("async unsubscribe failed")) as unknown as void;
      }
      base.live.unsubscribe(symbols);
    },
  });
  gateway = await startGateway(feed);
  const client = await gateway.connect();

  client.send({ type: "subscribe", requestId: 4, symbols: ["AAPL", "MSFT"] });
  await client.next("snapshot");

  mode = "sync";
  client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  await client.settle();
  expect(client.all("error")).toEqual([]);

  mode = "async";
  client.socket.close();
  await client.closed;

  const next = await gateway.connect();
  next.send({ type: "subscribe", requestId: 5, symbols: ["SPY"] });
  await expect(next.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "SPY" }] });
  expect(base.upstream()).toEqual(["AAPL", "MSFT", "SPY"]);

  mode = "ok";
  await vi.waitFor(() => expect(base.upstream()).toEqual(["SPY"]), RETRY_WAIT);
});

test("a failed upstream snapshot answers unavailable, and the quote arrives as a tick", async () => {
  const base = createFakeFeed();
  let failMsft = true;
  const feed = withLive(base, {
    async snapshot(symbols) {
      if (failMsft && symbols.includes("MSFT")) {
        throw new Error("snapshot failed");
      }
      return base.live.snapshot(symbols);
    },
  });
  gateway = await startGateway(feed);
  const client = await gateway.connect();

  client.send({ type: "subscribe", requestId: 7, symbols: ["MSFT", "MSFT"] });
  await expect(client.next("error")).resolves.toEqual({
    type: "error",
    code: "unavailable",
    message: expect.any(String),
    requestId: 7,
    symbols: ["MSFT"],
  });
  await expect(client.next("snapshot")).resolves.toEqual({
    type: "snapshot",
    requestId: 7,
    quotes: [],
  });
  expect(base.upstream()).toEqual(["MSFT"]);

  failMsft = false;
  const quotes = await client.next("quotes");
  expect(quotes.quotes.map((quote) => quote.symbol)).toEqual(["MSFT"]);
});

test("a throwing catalogue closes with 1011, sends no reply and releases everything", async () => {
  const base = createFakeFeed({ recordCalls: true });
  let down = false;
  const feed = {
    ...base,
    catalogue: {
      ...base.catalogue,
      get: (symbol: string) => {
        if (down) {
          throw new Error("catalogue down");
        }
        return base.catalogue.get(symbol);
      },
    },
  };
  gateway = await startGateway(feed);
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 8, symbols: ["AAPL"] });
  await client.next("snapshot");
  const before = client.received.length;

  down = true;
  client.send({ type: "subscribe", requestId: 9, symbols: ["NVDA"] });
  await expect(client.closed).resolves.toBe(1011);
  expect(client.received.slice(before)).toEqual([]);
  await vi.waitFor(() => expect(base.upstream()).toEqual([]), RETRY_WAIT);
  expect(base.upstreamCalls.flatMap((call) => call.symbols)).not.toContain("NVDA");
});

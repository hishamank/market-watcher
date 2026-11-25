import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway;

beforeEach(async () => {
  gateway = await startGateway();
});

afterEach(async () => {
  await gateway.close();
});

test("the first message is a welcome with the agreed settings", async () => {
  const client = await gateway.connect();
  const welcome = await client.next("welcome");
  expect(welcome).toMatchObject({
    protocolVersion: 1,
    feedMode: "simulated",
    marketStatus: "open",
    heartbeatIntervalMs: 5_000,
    maxSubscriptions: 100,
  });
  expect(client.received[0]).toBe(welcome);
});

test("subscribing twice re-sends the snapshot and starts upstream once", async () => {
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  const first = await client.next("snapshot");
  client.send({ type: "subscribe", requestId: 2, symbols: ["AAPL", "MSFT"] });
  const second = await client.next("snapshot");

  expect(first.quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
  expect(second.quotes.map((quote) => quote.symbol)).toEqual(["AAPL", "MSFT"]);
  expect(gateway.feed.upstreamCalls).toEqual([
    { action: "subscribe", symbols: ["AAPL"] },
    { action: "subscribe", symbols: ["MSFT"] },
  ]);
});

test("unknown symbols come back in one error while the rest subscribe", async () => {
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 3, symbols: ["AAPL", "ZZZZ", "aapl"] });
  const error = await client.next("error");
  const snapshot = await client.next("snapshot");

  expect(error).toMatchObject({ code: "unknown_symbol", symbols: ["ZZZZ", "aapl"] });
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
  expect(gateway.feed.upstream()).toEqual(["AAPL"]);
});

test("symbols beyond 100 come back in one subscription_limit error", async () => {
  await gateway.close();
  const symbols = Array.from({ length: 102 }, (_, index) => `S${index}`);
  gateway = await startGateway(createFakeFeed({ symbols }));
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 4, symbols: symbols.slice(0, 99) });
  await client.next("snapshot");
  client.send({ type: "subscribe", requestId: 5, symbols: ["S0", "S99", "S100", "S101"] });

  const error = await client.next("error");
  const snapshot = await client.next("snapshot");
  expect(error).toMatchObject({ code: "subscription_limit", symbols: ["S100", "S101"] });
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["S0", "S99"]);
});

test("upstream starts at the first watcher and stops after the last leaves", async () => {
  const alice = await gateway.connect();
  const bob = await gateway.connect();
  alice.send({ type: "subscribe", requestId: 6, symbols: ["AAPL", "NVDA"] });
  await alice.next("snapshot");
  bob.send({ type: "subscribe", requestId: 7, symbols: ["AAPL"] });
  await bob.next("snapshot");
  expect(gateway.feed.upstream()).toEqual(["AAPL", "NVDA"]);

  alice.send({ type: "unsubscribe", symbols: ["AAPL", "NVDA", "SPY"] });
  await alice.settle();
  expect(gateway.feed.upstream()).toEqual(["AAPL"]);

  bob.socket.close();
  await vi.waitFor(() => expect(gateway.feed.upstream()).toEqual([]));
  expect(gateway.feed.upstreamCalls).toEqual([
    { action: "subscribe", symbols: ["AAPL", "NVDA"] },
    { action: "unsubscribe", symbols: ["NVDA"] },
    { action: "unsubscribe", symbols: ["AAPL"] },
  ]);
});

test("a malformed message gets invalid_message and the socket stays open", async () => {
  const client = await gateway.connect();
  client.socket.send("not json");
  client.send({ type: "chaos", action: "drop" });
  await expect(client.next("error")).resolves.toMatchObject({ code: "invalid_message" });
  await expect(client.next("error")).resolves.toMatchObject({ code: "invalid_message" });
  client.send({ type: "subscribe", requestId: 8, symbols: ["SPY"] });
  await expect(client.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "SPY" }] });
});

test("a calendar change reaches every connection as market_status", async () => {
  const client = await gateway.connect();
  await client.next("welcome");
  gateway.feed.setStatus("closed");
  await expect(client.next("market_status")).resolves.toEqual({
    type: "market_status",
    marketStatus: "closed",
  });
});

test("the default fake feed keeps no upstream call history unless opted in", async () => {
  await gateway.close();
  const feed = createFakeFeed();
  gateway = await startGateway(feed);
  for (let round = 0; round < 3; round += 1) {
    const client = await gateway.connect();
    client.send({ type: "subscribe", requestId: 9, symbols: ["AAPL"] });
    await client.next("snapshot");
    client.socket.close();
    await client.closed;
  }
  await vi.waitFor(() => expect(feed.upstream()).toEqual([]));
  expect(feed.upstreamCalls).toEqual([]);
});

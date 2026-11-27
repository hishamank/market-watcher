import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createHeldFeed } from "./held-feed.ts";
import { fakeTimers, type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway;
beforeEach(async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
});
afterEach(async () => {
  await gateway.close();
  vi.useRealTimers();
});

for (const alreadyNotified of [false, true]) {
  test(`an over-limit unsubscribe releases symbols after notified=${alreadyNotified}`, async () => {
    const alice = await gateway.connect();
    const bob = await gateway.connect();
    bob.send({ type: "subscribe", requestId: 1, symbols: ["MSFT"] });
    await bob.next("snapshot");
    alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
    await alice.next("snapshot");
    for (let index = 0; index < (alreadyNotified ? 20 : 19); index += 1) {
      alice.send({ type: "chaos", action: "history_latency", enabled: false });
    }
    alice.send({ type: "unsubscribe", symbols: ["AAPL", "MSFT"] });
    await expect.poll(() => gateway.feed.upstream()).toEqual(["MSFT"]);
    expect(alice.socket.readyState).toBe(alice.socket.OPEN);
    expect(bob.socket.readyState).toBe(bob.socket.OPEN);
  });
}

test("an over-limit unsubscribe waits for the pending subscribe before removing it", async () => {
  await gateway.close();
  const feed = createHeldFeed();
  gateway = await startGateway(feed);
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await client.settle();
  expect(feed.calls).toHaveLength(1);
  for (let index = 0; index < 20; index += 1) {
    client.send({ type: "unsubscribe", symbols: ["MSFT"] });
  }
  client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  await client.settle();
  expect(client.all("snapshot")).toEqual([]);
  feed.passThrough();
  await client.next("snapshot");
  await expect.poll(() => feed.upstream()).toEqual([]);
  expect(feed.calls.map(({ action, symbols }) => ({ action, symbols }))).toEqual([
    { action: "subscribe", symbols: ["AAPL"] },
    { action: "unsubscribe", symbols: ["AAPL"] },
  ]);
  expect(client.socket.readyState).toBe(client.socket.OPEN);
});

test("unsubscribe after a rate-limited subscribe does not create upstream work", async () => {
  const client = await gateway.connect();
  for (let index = 0; index < 20; index += 1) {
    client.send({ type: "unsubscribe", symbols: ["MSFT"] });
  }
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  await client.settle();
  expect(client.all("error")).toEqual([
    { type: "error", code: "rate_limited", message: "Too many messages", requestId: 1 },
  ]);
  expect(gateway.feed.upstream()).toEqual([]);
  expect(gateway.feed.upstreamCalls).toEqual([]);
  expect(client.socket.readyState).toBe(client.socket.OPEN);
});

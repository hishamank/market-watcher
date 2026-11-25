import { afterEach, expect, test, vi } from "vitest";
import { createHeldFeed, type HeldFeed } from "./held-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

async function start(): Promise<{ gateway: Gateway; feed: HeldFeed }> {
  const feed = createHeldFeed();
  gateway = await startGateway(feed);
  return { gateway, feed };
}

async function callAt(feed: HeldFeed, index: number) {
  await vi.waitFor(() => expect(feed.calls.length).toBeGreaterThan(index));
  return feed.calls[index]!;
}

const RETRY_WAIT = { timeout: 3_000 };

test("a second watcher waits for a pending start and is answered when it fails", async () => {
  const { gateway, feed } = await start();
  const alice = await gateway.connect();
  const bob = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  const first = await callAt(feed, 0);
  bob.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
  await bob.settle();
  expect(alice.all("snapshot")).toEqual([]);
  expect(bob.all("snapshot")).toEqual([]);

  first.reject();
  await expect(alice.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "AAPL" }] });
  const retry = await callAt(feed, 1);
  expect(retry).toMatchObject({ action: "subscribe", symbols: ["AAPL"] });
  await bob.settle();
  expect(bob.all("snapshot")).toEqual([]);
  retry.reject();
  await expect(bob.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "AAPL" }] });
  expect([...alice.all("error"), ...bob.all("error")]).toEqual([]);

  feed.passThrough();
  await vi.waitFor(() => expect(feed.upstream()).toEqual(["AAPL"]), RETRY_WAIT);
});

test("a second watcher is answered only once its own retry settles", async () => {
  const { gateway, feed } = await start();
  const alice = await gateway.connect();
  const bob = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 3, symbols: ["AAPL"] });
  const first = await callAt(feed, 0);
  bob.send({ type: "subscribe", requestId: 4, symbols: ["AAPL"] });
  await bob.settle();
  first.reject();
  await alice.next("snapshot");
  const retry = await callAt(feed, 1);
  await bob.settle();
  expect(bob.all("snapshot")).toEqual([]);
  retry.resolve();

  const snapshot = await bob.next("snapshot");
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["AAPL"]);
  expect(feed.upstream()).toEqual(["AAPL"]);
});

test("an old failed start cannot undo a newer subscription from the same client", async () => {
  const { gateway, feed } = await start();
  const alice = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 5, symbols: ["AAPL"] });
  const first = await callAt(feed, 0);
  alice.send({ type: "unsubscribe", symbols: ["AAPL"] });
  alice.send({ type: "subscribe", requestId: 6, symbols: ["AAPL"] });
  await alice.settle();
  first.reject();
  feed.passThrough();

  await expect(alice.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "AAPL" }] });
  await expect(alice.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "AAPL" }] });
  await vi.waitFor(() => expect(feed.upstream()).toEqual(["AAPL"]));
  feed.tick("AAPL", "101.00");
  await expect(alice.next("quotes")).resolves.toMatchObject({
    quotes: [{ symbol: "AAPL", price: "101.00" }],
  });
  expect(feed.upstream()).toEqual(["AAPL"]);
});

test("a failed disconnect stop is retried until upstream converges", async () => {
  const { gateway, feed } = await start();
  const alice = await gateway.connect();
  feed.passThrough();
  alice.send({ type: "subscribe", requestId: 7, symbols: ["AAPL", "MSFT"] });
  await alice.next("snapshot");

  feed.holdCalls();
  const stopsBefore = feed.calls.length;
  alice.socket.close();
  const stop = await callAt(feed, stopsBefore);
  expect(stop).toMatchObject({ action: "unsubscribe", symbols: ["AAPL", "MSFT"] });
  stop.reject();
  expect(feed.upstream()).toEqual(["AAPL", "MSFT"]);

  feed.passThrough();
  await vi.waitFor(() => expect(feed.upstream()).toEqual([]), RETRY_WAIT);
});

test("a pending cleanup retry never stops a newer subscriber", async () => {
  const { gateway, feed } = await start();
  const alice = await gateway.connect();
  const bob = await gateway.connect();
  feed.passThrough();
  alice.send({ type: "subscribe", requestId: 8, symbols: ["AAPL"] });
  await alice.next("snapshot");

  feed.holdCalls();
  const stopsBefore = feed.calls.length;
  alice.send({ type: "unsubscribe", symbols: ["AAPL"] });
  (await callAt(feed, stopsBefore)).reject();
  feed.passThrough();
  bob.send({ type: "subscribe", requestId: 9, symbols: ["AAPL"] });
  await bob.next("snapshot");

  await new Promise((resolve) => setTimeout(resolve, 1_500));
  expect(feed.upstream()).toEqual(["AAPL"]);
  feed.tick("AAPL", "102.00");
  await expect(bob.next("quotes")).resolves.toMatchObject({ quotes: [{ symbol: "AAPL" }] });
});

test.each(["resolve", "reject"] as const)(
  "a close during a pending start stops upstream exactly once when the start %ss",
  async (outcome) => {
    const { gateway, feed } = await start();
    const alice = await gateway.connect();
    alice.send({ type: "subscribe", requestId: 10, symbols: ["AAPL"] });
    const first = await callAt(feed, 0);
    alice.socket.close();
    await alice.closed;
    first[outcome]();
    feed.passThrough();

    await vi.waitFor(() =>
      expect(feed.calls.filter((call) => call.action === "unsubscribe")).toHaveLength(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(feed.calls.map((call) => call.action)).toEqual(["subscribe", "unsubscribe"]);
    expect(feed.upstream()).toEqual([]);
  },
);

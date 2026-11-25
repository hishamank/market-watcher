import { expect, test, vi } from "vitest";
import { buildApp } from "../app.ts";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { createHeldFeed } from "./held-feed.ts";
import { startGateway } from "./testing.ts";

const AFTER_RETRY_MS = 1_500;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function activeTimers(): number {
  return process.getActiveResourcesInfo().filter((kind) => kind === "Timeout").length;
}

test("after close resolves, queued reconciliation never calls the feed", async () => {
  const timersBefore = activeTimers();
  const feed = createHeldFeed();
  const gateway = await startGateway(feed);
  const alice = await gateway.connect();
  feed.passThrough();
  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.next("snapshot");

  feed.holdCalls();
  alice.send({ type: "unsubscribe", symbols: ["AAPL"] });
  await vi.waitFor(() => expect(feed.calls).toHaveLength(2));
  feed.calls[1]!.reject();
  alice.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
  await vi.waitFor(() => expect(feed.calls).toHaveLength(3));
  await pause(AFTER_RETRY_MS);

  await gateway.close();
  const callsAtClose = feed.calls.length;
  expect(feed.calls.at(-1)).toMatchObject({ action: "unsubscribe", symbols: ["AAPL"] });
  feed.calls.forEach((call) => call.resolve());
  await pause(AFTER_RETRY_MS);

  expect(feed.calls).toHaveLength(callsAtClose);
  expect(feed.upstream()).toEqual([]);
  expect(activeTimers()).toBeLessThanOrEqual(timersBefore);
});

test("after close resolves, a pending snapshot is never fetched again", async () => {
  const base = createFakeFeed();
  let fetches = 0;
  const feed = {
    ...base,
    live: {
      ...base.live,
      snapshot: async () => {
        fetches += 1;
        throw new Error("snapshot unavailable");
      },
    },
  };
  const gateway = await startGateway(feed);
  const alice = await gateway.connect();
  alice.send({ type: "subscribe", requestId: 3, symbols: ["AAPL"] });
  await expect(alice.next("snapshot")).resolves.toEqual({
    type: "snapshot",
    requestId: 3,
    quotes: [],
  });
  await vi.waitFor(() => expect(fetches).toBeGreaterThanOrEqual(2), { timeout: 3_000 });

  await gateway.close();
  const fetchesAtClose = fetches;
  await pause(AFTER_RETRY_MS);

  expect(fetches).toBe(fetchesAtClose);
  expect(base.upstream()).toEqual([]);
});

test("a boot that fails before the socket route loads leaves no hub timers", async () => {
  const timersBefore = activeTimers();
  const app = buildApp({
    feed: createFakeFeed(),
    feedMode: "simulated",
    allowedOrigins: new Set(),
    logger: false,
  });
  app.addHook("onRoute", (route) => {
    if (route.url === "/stocks") throw new Error("route registration failed");
  });

  await expect(app.ready()).rejects.toThrow("route registration failed");
  await app.close();

  expect(activeTimers()).toBeLessThanOrEqual(timersBefore);
});

test("the hub closes before an onClose hook the gateway's owner adds", async () => {
  const timersBefore = activeTimers();
  const app = buildApp({
    feed: createFakeFeed(),
    feedMode: "simulated",
    allowedOrigins: new Set(),
    logger: false,
  });
  let timersAtOwnerClose = Number.POSITIVE_INFINITY;
  app.addHook("onClose", async () => {
    timersAtOwnerClose = activeTimers();
  });

  await app.ready();
  await app.close();

  expect(timersAtOwnerClose).toBeLessThanOrEqual(timersBefore);
});

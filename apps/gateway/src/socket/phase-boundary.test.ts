import { expect, test, vi } from "vitest";
import type { Quote } from "@mini/contracts";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { fakeTimers, startGateway } from "./testing.ts";

const boundary = Date.UTC(2025, 5, 25);

test("a queued tick expires before flush and a delayed prior-phase tick reaches nobody", async () => {
  vi.useFakeTimers(fakeTimers());
  let now = boundary - 1;
  const feed = createFakeFeed({ now: () => boundary - 1 });
  const gateway = await startGateway(feed, false, "simulated", () => now);
  try {
    const alice = await gateway.connect();
    const bob = await gateway.connect();
    for (const client of [alice, bob]) {
      client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
      expect((await client.next("snapshot")).quotes).toHaveLength(1);
    }
    feed.tick("AAPL", "202.13");
    now = boundary;
    await vi.advanceTimersByTimeAsync(250);
    feed.tick("AAPL", "202.14");
    await vi.advanceTimersByTimeAsync(250);
    for (const client of [alice, bob]) {
      await client.settle();
      expect(client.all("quotes")).toEqual([]);
    }
  } finally {
    await gateway.close();
    vi.useRealTimers();
  }
});

test("a subscribe waiting on another symbol rechecks its cached quote before replying", async () => {
  vi.useFakeTimers(fakeTimers());
  let time = boundary - 1;
  const now = () => time;
  const feed = createFakeFeed({ now });
  const gateway = await startGateway(feed, false, "simulated", now);
  try {
    const client = await gateway.connect();
    client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
    expect((await client.next("snapshot")).quotes).toHaveLength(1);
    const pending = Promise.withResolvers<Quote[]>();
    const started = Promise.withResolvers<void>();
    vi.spyOn(feed.live, "snapshot").mockImplementationOnce(() => {
      started.resolve();
      return pending.promise;
    });
    client.send({ type: "subscribe", requestId: 2, symbols: ["AAPL", "MSFT"] });
    await started.promise;
    time = boundary;
    pending.resolve([]);
    expect(await client.next("snapshot")).toMatchObject({ requestId: 2, quotes: [] });
    expect(client.all("error")).toMatchObject([{ code: "unavailable", symbols: ["AAPL", "MSFT"] }]);
  } finally {
    await gateway.close();
    vi.useRealTimers();
  }
});

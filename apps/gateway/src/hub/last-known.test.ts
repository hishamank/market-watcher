import type { Quote } from "@mini/contracts";
import { expect, test, vi } from "vitest";
import { fakeTimers, startGateway } from "../socket/testing.ts";
import { createFakeFeed } from "./fake-feed.ts";

test.each([false, true])(
  "snapshot-only recovery retries a marked subscriber (already expired: %s)",
  async (expired) => {
    vi.useFakeTimers(fakeTimers());
    let time = 86_400_000;
    let failing = expired;
    let held: Quote = {
      symbol: "AAPL",
      price: "100.00",
      previousClose: "99.00",
      change: "1.00",
      changePercent: "1.01",
      timestamp: expired ? 1 : time,
    };
    const feed = createFakeFeed({ now: () => time });
    feed.live.lastKnown = () => [held];
    feed.live.snapshot = async () => {
      if (failing) throw new Error("outage");
      return [held];
    };
    const gateway = await startGateway(feed, false, "live", () => time);
    try {
      const client = await gateway.connect();
      client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
      expect((await client.next("snapshot")).quotes[0]?.lastKnown).toBe(expired ? true : undefined);
      time += 86_400_000;
      failing = true;
      await vi.advanceTimersByTimeAsync(1_250);
      await client.settle();
      expect(client.all("quotes").flatMap((message) => message.quotes)).toMatchObject(
        expired ? [] : [{ lastKnown: true }],
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await client.settle();
      expect(client.all("quotes").flatMap((message) => message.quotes)).toHaveLength(
        expired ? 0 : 1,
      );
      held = { ...held, price: "101.00" };
      await vi.advanceTimersByTimeAsync(1_000);
      await client.settle();
      expect(client.all("quotes").at(-1)?.quotes).toMatchObject([
        { price: "101.00", lastKnown: true },
      ]);
      failing = false;
      held = { ...held, timestamp: time };
      await vi.advanceTimersByTimeAsync(1_000);
      await client.settle();
      expect(client.all("quotes").at(-1)?.quotes[0]).toEqual(held);
    } finally {
      await gateway.close();
      vi.useRealTimers();
    }
  },
);

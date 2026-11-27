import { expect, test, vi } from "vitest";
import { createHeldFeed } from "../socket/held-feed.ts";
import { createHub } from "./hub.ts";
import type { Peer } from "./member.ts";

function blockedPeer(): Peer {
  return {
    send: vi.fn(),
    reply: vi.fn(),
    close: vi.fn(),
    bufferedAmount: () => Number.POSITIVE_INFINITY,
  };
}

function settledWithin(work: Promise<void>, ms: number): Promise<"settled" | "hung"> {
  return Promise.race([
    work.then(() => "settled" as const),
    new Promise<"hung">((resolve) => setTimeout(() => resolve("hung"), ms)),
  ]);
}

test("a subscribe still waiting on upstream when its blocked peer leaves settles, with the queue behind it", async () => {
  const feed = createHeldFeed();
  const hub = createHub({ feed, now: () => Date.now(), warn: () => undefined });
  const peer = blockedPeer();
  hub.join(peer);

  const subscribe = hub.subscribe(peer, { requestId: 1, symbols: ["AAPL"] });
  const queued = hub.unsubscribe(peer, ["AAPL"]);
  await vi.waitFor(() => expect(feed.calls).toHaveLength(1));

  await hub.leave(peer);
  feed.passThrough();

  await expect(settledWithin(subscribe, 1_000)).resolves.toBe("settled");
  await expect(settledWithin(queued, 1_000)).resolves.toBe("settled");
  expect(peer.reply).not.toHaveBeenCalled();
  expect(hub.stats()).toEqual({ connections: 0, upstreamSymbols: 0 });
  await hub.close();
});

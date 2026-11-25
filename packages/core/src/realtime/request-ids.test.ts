import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway, type FakeGatewayOptions } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";

function setup(options: FakeGatewayOptions = {}) {
  const gateway = createFakeGateway({ holdReplies: true, ...options });
  const quoteStore = createQuoteStore();
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore,
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    random: () => 1,
    onWarning: () => {},
  });
  client.start();
  vi.advanceTimersByTime(0);
  return { gateway, client, quoteStore, conn: gateway.latestConnection() };
}

function advanceWithHeartbeats(conn: ReturnType<typeof setup>["conn"], ms: number): void {
  for (let elapsed = 0; elapsed < ms; elapsed += 1_000) {
    vi.advanceTimersByTime(Math.min(1_000, ms - elapsed));
    conn.sendHeartbeat();
  }
}

describe("subscribe replies are matched by request ID", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles each request by its own ID when replies arrive out of order", () => {
    const { gateway, client, quoteStore, conn } = setup();
    client.acquireSymbol("AAPL");
    client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(0);
    conn.deliverHeldReplies();
    conn.drop();
    vi.advanceTimersByTime(500);
    const next = gateway.latestConnection();
    vi.advanceTimersByTime(1);
    client.acquireSymbol("NVDA");
    vi.advanceTimersByTime(200);
    expect(next.heldRequestIds()).toEqual([1, 2]);

    next.deliverReply(2);
    expect(quoteStore.getQuote("NVDA")).toBeDefined();
    expect(client.getStatus()).toBe("stale");
    next.deliverReply(1);
    expect(client.getStatus()).toBe("connected");

    next.sendSnapshot([makeQuote("AAPL", "199.00", 9_000_000_000_000)], 77);
    expect(quoteStore.getQuote("AAPL")?.price).toBe("199.00");
    advanceWithHeartbeats(next, 12_000);
    expect(next.sentMessages).toHaveLength(2);
    client.stop();
  });

  it("lets a newer request win when an older reply for the same symbol arrives late", () => {
    const { client, conn } = setup();
    const release = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    release();
    vi.advanceTimersByTime(2_000);
    client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(200);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["AAPL"] },
    ]);

    conn.deliverReply(2);
    conn.deliverReply(1);
    advanceWithHeartbeats(conn, 12_000);
    expect(conn.sentMessages).toHaveLength(3);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("resends a missing reply once under a new ID, then reconnects", () => {
    const { gateway, client, conn } = setup();
    client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    conn.discardReply(1);

    advanceWithHeartbeats(conn, 10_000);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["AAPL"] },
    ]);
    conn.discardReply(2);
    expect(client.getStatus()).toBe("connected");

    advanceWithHeartbeats(conn, 9_000);
    expect(client.getStatus()).toBe("connected");
    advanceWithHeartbeats(conn, 1_000);
    expect(client.getStatus()).toBe("stale");
    expect(conn.socket.readyState).toBe(3);

    vi.advanceTimersByTime(500);
    expect(gateway.connections).toHaveLength(2);
    vi.advanceTimersByTime(1);
    const next = gateway.latestConnection();
    expect(next.sentMessages).toEqual([{ type: "subscribe", requestId: 1, symbols: ["AAPL"] }]);
    next.deliverHeldReplies();
    expect(client.getStatus()).toBe("connected");
    advanceWithHeartbeats(next, 11_000);
    expect(gateway.connections).toHaveLength(2);
    expect(next.sentMessages).toHaveLength(1);
    client.stop();
  });

  it("re-queues a rate_limited request for a flush at least 1 s later", () => {
    const { client, quoteStore, conn } = setup();
    client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    conn.discardReply(1);
    conn.sendRateLimited(1);
    client.acquireSymbol("MSFT");

    vi.advanceTimersByTime(999);
    expect(conn.sentMessages).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["AAPL", "MSFT"] },
    ]);
    conn.deliverHeldReplies();
    expect(quoteStore.getQuote("AAPL")).toBeDefined();
    expect(quoteStore.getQuote("MSFT")).toBeDefined();
    client.stop();
  });

  it("keeps a burst of mounts and unmounts under 10 messages a second", () => {
    const { client, conn } = setup({ holdReplies: false });
    const sentAt: number[] = [];
    const send = conn.socket.send.bind(conn.socket);
    conn.socket.send = (data) => {
      sentAt.push(Date.now());
      send(data);
    };
    const releases: (() => void)[] = [];
    for (let step = 0; step < 300; step += 1) {
      releases.push(client.acquireSymbol(`S${step % 40}`));
      if (step >= 5) releases[step - 5]?.();
      vi.advanceTimersByTime(10);
    }
    releases.forEach((release) => release());
    vi.advanceTimersByTime(4_000);

    expect(sentAt.length).toBeGreaterThan(10);
    for (const start of sentAt) {
      expect(
        sentAt.filter((time) => time >= start && time < start + 1_000).length,
      ).toBeLessThanOrEqual(10);
    }
    const flushes = [...new Set(sentAt)];
    flushes.slice(1).forEach((time, index) => {
      expect(time - flushes[index]!).toBeGreaterThanOrEqual(200);
    });
    client.stop();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";

describe("socket client status transitions and reconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays connecting until welcome and snapshots for every referenced symbol arrive", () => {
    const gateway = createFakeGateway({ autoOpen: false, autoWelcome: false, autoSnapshot: false });
    const network = createFakeNetwork("online");
    const quoteStore = createQuoteStore();
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore,
      network,
      socketFactory: gateway.socketFactory,
      onWarning: () => {},
    });

    client.acquireSymbol("AAPL");
    client.acquireSymbol("MSFT");
    client.start();
    expect(client.getStatus()).toBe("connecting");

    const conn = gateway.latestConnection();
    conn.open();
    expect(client.getStatus()).toBe("connecting");

    conn.sendWelcome();
    expect(client.getStatus()).toBe("connecting");
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
    ]);

    conn.sendQuotes([makeQuote("AAPL", "190.00", 1_000)]);
    expect(client.getStatus()).toBe("connecting");

    conn.sendSnapshot([makeQuote("AAPL", "190.10", 1_001)], 99);
    expect(client.getStatus()).toBe("connecting");
    expect(quoteStore.getQuote("AAPL")?.price).toBe("190.10");

    conn.sendSnapshot([makeQuote("MSFT", "420.50", 1_002)], 1);
    expect(client.getStatus()).toBe("connected");
    expect(quoteStore.getQuote("AAPL")?.price).toBe("190.10");
    expect(quoteStore.getQuote("MSFT")?.price).toBe("420.50");
    client.stop();
  });

  it("goes stale immediately on close or error and backs off exponentially", () => {
    const gateway = createFakeGateway({ autoOpen: false });
    const network = createFakeNetwork("online");
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      socketFactory: gateway.socketFactory,
      random: () => 1,
      onWarning: () => {},
    });

    client.start();
    gateway.latestConnection().open();
    expect(client.getStatus()).toBe("connected");

    gateway.latestConnection().emitError();
    gateway.latestConnection().drop();
    expect(client.getStatus()).toBe("stale");
    expect(gateway.connections).toHaveLength(1);

    vi.advanceTimersByTime(499);
    expect(gateway.connections).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(gateway.connections).toHaveLength(2);

    gateway.latestConnection().drop();
    vi.advanceTimersByTime(999);
    expect(gateway.connections).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(gateway.connections).toHaveLength(3);

    gateway.latestConnection().drop();
    vi.advanceTimersByTime(1_999);
    expect(gateway.connections).toHaveLength(3);
    vi.advanceTimersByTime(1);
    expect(gateway.connections).toHaveLength(4);

    client.stop();
  });

  it("resets backoff on retryNow and stays stale until reconnect snapshots arrive", () => {
    const gateway = createFakeGateway({ autoOpen: false, autoWelcome: false, autoSnapshot: false });
    const network = createFakeNetwork("online");
    const onReconnect = vi.fn();
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      socketFactory: gateway.socketFactory,
      random: () => 1,
      onWarning: () => {},
    });

    client.subscribeReconnect(onReconnect);
    client.acquireSymbol("AAPL");
    client.start();
    gateway.latestConnection().open();
    gateway.latestConnection().sendWelcome();
    gateway.latestConnection().sendSnapshot([makeQuote("AAPL", "190.00", 1_000)]);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).not.toHaveBeenCalled();

    gateway.latestConnection().drop();
    vi.advanceTimersByTime(500);
    gateway.latestConnection().drop();
    vi.advanceTimersByTime(1_000);
    gateway.latestConnection().drop();
    expect(gateway.connections).toHaveLength(3);

    client.retryNow();
    expect(gateway.connections).toHaveLength(4);
    gateway.latestConnection().drop();

    vi.advanceTimersByTime(499);
    expect(gateway.connections).toHaveLength(4);
    vi.advanceTimersByTime(1);
    expect(gateway.connections).toHaveLength(5);

    const recovered = gateway.latestConnection();
    recovered.open();
    recovered.sendWelcome();
    expect(client.getStatus()).toBe("stale");
    recovered.sendSnapshot([makeQuote("AAPL", "191.00", 2_000)]);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    client.stop();
  });
});

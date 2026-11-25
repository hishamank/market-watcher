import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork } from "../testing/fake-platform.ts";

describe("subscriptions, coalescing and reference counting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces twenty mounts in the same tick into one subscribe message", () => {
    const gateway = createFakeGateway();
    const network = createFakeNetwork("online");
    const quoteStore = createQuoteStore();
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore,
      network,
      socketFactory: gateway.socketFactory,
      onWarning: () => {},
    });

    client.start();
    vi.advanceTimersByTime(0);
    expect(client.getStatus()).toBe("connected");

    const symbols = Array.from({ length: 20 }, (_, index) => `SYM${index + 1}`);
    const releases = symbols.map((symbol) => client.acquireSymbol(symbol));

    expect(gateway.latestConnection().sentMessages).toHaveLength(0);
    vi.advanceTimersByTime(0);

    const subscribes = gateway
      .latestConnection()
      .sentMessages.filter((message) => message.type === "subscribe");
    expect(subscribes).toHaveLength(1);
    expect(subscribes[0]).toEqual({ type: "subscribe", requestId: 1, symbols });

    for (const release of releases) {
      release();
    }
    vi.advanceTimersByTime(2_000);
    const unsubscribes = gateway
      .latestConnection()
      .sentMessages.filter((message) => message.type === "unsubscribe");
    expect(unsubscribes).toHaveLength(1);
    expect(unsubscribes[0]).toEqual({ type: "unsubscribe", symbols });
    client.stop();
  });

  it("sends no unsubscribe when unmounted and remounted within 2 s", () => {
    const gateway = createFakeGateway();
    const network = createFakeNetwork("online");
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      socketFactory: gateway.socketFactory,
      onWarning: () => {},
    });

    client.start();
    vi.advanceTimersByTime(0);

    const releaseFirst = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
    ]);

    releaseFirst();
    vi.advanceTimersByTime(1_999);
    const releaseSecond = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(2_500);

    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
    ]);

    releaseSecond();
    vi.advanceTimersByTime(2_000);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
    ]);

    client.stop();
  });

  it("tracks duplicate references and unsubscribes only after the last unmount plus 2 s", () => {
    const gateway = createFakeGateway();
    const network = createFakeNetwork("online");
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      socketFactory: gateway.socketFactory,
      onWarning: () => {},
    });

    client.start();
    vi.advanceTimersByTime(0);

    const releaseA = client.acquireSymbol("MSFT");
    const releaseB = client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(0);

    releaseA();
    vi.advanceTimersByTime(5_000);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["MSFT"] },
    ]);

    releaseB();
    vi.advanceTimersByTime(1_999);
    expect(gateway.latestConnection().sentMessages).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["MSFT"] },
    ]);

    client.stop();
  });

  it("re-subscribes every referenced symbol in one message on reconnect", () => {
    const gateway = createFakeGateway();
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
    vi.advanceTimersByTime(0);

    const releaseAapl = client.acquireSymbol("AAPL");
    const releaseMsft = client.acquireSymbol("MSFT");
    const releaseNvda = client.acquireSymbol("NVDA");
    vi.advanceTimersByTime(0);

    releaseNvda();
    gateway.latestConnection().drop();
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(1);
    expect(gateway.connections).toHaveLength(2);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
    ]);
    expect(client.getStatus()).toBe("connected");

    releaseAapl();
    releaseMsft();
    client.stop();
  });
});

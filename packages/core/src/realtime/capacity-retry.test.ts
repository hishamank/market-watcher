import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway, type FakeGatewayOptions } from "../testing/fake-gateway.ts";
import { createFakeNetwork } from "../testing/fake-platform.ts";

function setup(options: FakeGatewayOptions) {
  const gateway = createFakeGateway(options);
  const quoteStore = createQuoteStore();
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore,
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    onWarning: () => {},
  });
  client.start();
  vi.advanceTimersByTime(0);
  expect(client.getStatus()).toBe("connected");
  return { gateway, client, quoteStore };
}

describe("subscription_limit rejections retry when capacity frees", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-requests a still-referenced rejected symbol after the delayed unsubscribe", () => {
    const { gateway, client, quoteStore } = setup({ maxSubscriptions: 1 });
    const releaseAapl = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);

    releaseAapl();
    client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(0);
    expect(quoteStore.getQuote("MSFT")).toBeUndefined();

    vi.advanceTimersByTime(2_000);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 3, symbols: ["MSFT"] },
    ]);
    expect(quoteStore.getQuote("MSFT")).toBeDefined();
    expect(gateway.latestConnection().subscribedSymbols).toEqual(new Set(["MSFT"]));
    client.stop();
  });

  it("batches retries and never retries unknown or released symbols", () => {
    const { gateway, client } = setup({ maxSubscriptions: 2, unknownSymbols: ["NOPE"] });
    const releaseAapl = client.acquireSymbol("AAPL");
    const releaseMsft = client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(0);

    releaseAapl();
    releaseMsft();
    client.acquireSymbol("NVDA");
    client.acquireSymbol("TSLA");
    const releaseAmzn = client.acquireSymbol("AMZN");
    client.acquireSymbol("NOPE");
    vi.advanceTimersByTime(200);
    releaseAmzn();

    vi.advanceTimersByTime(2_000);
    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
      { type: "subscribe", requestId: 2, symbols: ["NVDA", "TSLA", "AMZN", "NOPE"] },
      { type: "unsubscribe", symbols: ["AAPL", "MSFT"] },
      { type: "subscribe", requestId: 3, symbols: ["NVDA", "TSLA"] },
    ]);
    expect(gateway.latestConnection().subscribedSymbols).toEqual(new Set(["NVDA", "TSLA"]));

    vi.advanceTimersByTime(9_000);
    expect(gateway.connections).toHaveLength(1);
    expect(gateway.latestConnection().sentMessages).toHaveLength(4);
    client.stop();
  });

  it("retries at once when the rejection arrives after an unsubscribe freed a slot", () => {
    const { gateway, client, quoteStore } = setup({ maxSubscriptions: 1, holdReplies: true });
    const conn = gateway.latestConnection();
    const releaseAapl = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    conn.deliverHeldReplies();

    releaseAapl();
    vi.advanceTimersByTime(1_900);
    client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(300);
    conn.deliverHeldReplies();
    vi.advanceTimersByTime(200);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 3, symbols: ["MSFT"] },
    ]);
    conn.deliverHeldReplies();
    expect(quoteStore.getQuote("MSFT")).toBeDefined();
    expect(conn.subscribedSymbols).toEqual(new Set(["MSFT"]));

    vi.advanceTimersByTime(10_000);
    expect(conn.sentMessages).toHaveLength(4);
    client.stop();
  });

  it("keeps server state when a superseded rejection arrives after a newer subscribe", () => {
    const { gateway, client } = setup({ maxSubscriptions: 1, holdReplies: true });
    const conn = gateway.latestConnection();
    const releaseAapl = client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(0);
    conn.deliverHeldReplies();

    releaseAapl();
    vi.advanceTimersByTime(1_900);
    const releaseMsft = client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(100);
    releaseMsft();
    vi.advanceTimersByTime(2_000);
    const releaseAgain = client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(200);
    conn.deliverHeldReplies();
    expect(conn.subscribedSymbols).toEqual(new Set(["MSFT"]));

    releaseAgain();
    vi.advanceTimersByTime(2_000);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "unsubscribe", symbols: ["MSFT"] },
      { type: "subscribe", requestId: 3, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["MSFT"] },
    ]);
    expect(conn.subscribedSymbols).toEqual(new Set());
    client.stop();
  });
});

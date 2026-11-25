import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway, type FakeGatewayOptions } from "../testing/fake-gateway.ts";
import { createFakeNetwork } from "../testing/fake-platform.ts";

function reconnected(symbols: readonly string[], options: FakeGatewayOptions = {}) {
  const gateway = createFakeGateway({ holdReplies: true, ...options });
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    random: () => 1,
    onWarning: () => {},
  });
  const releases = symbols.map((symbol) => client.acquireSymbol(symbol));
  client.start();
  vi.advanceTimersByTime(1);
  gateway.latestConnection().deliverHeldReplies();
  expect(client.getStatus()).toBe("connected");
  gateway.latestConnection().drop();
  vi.advanceTimersByTime(501);
  expect(client.getStatus()).toBe("stale");
  return { client, releases, conn: gateway.latestConnection() };
}

describe("a reply never settles a symbol a newer message replaced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("holds recovery for a capacity retry sent when its rejection arrives", () => {
    const { client, releases, conn } = reconnected(["AAPL", "MSFT"], { maxSubscriptions: 1 });
    releases[0]?.();
    vi.advanceTimersByTime(2_000);
    vi.advanceTimersByTime(300);
    conn.deliverReply(1);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
    ]);
    expect(client.getStatus()).toBe("stale");

    conn.deliverReply(2);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("ignores a reply that an unsubscribe overtook before the next subscribe", () => {
    const { client, releases, conn } = reconnected(["AAPL", "MSFT"]);
    releases[0]?.();
    vi.advanceTimersByTime(2_000);
    client.acquireSymbol("AAPL");
    conn.deliverReply(1);
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(200);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["AAPL"] },
    ]);
    conn.deliverReply(2);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });
});

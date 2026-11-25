import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore, createSocketClient } from "../index.ts";
import { createFakeGateway, type FakeGatewayOptions } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";

function setup(replies: FakeGatewayOptions = { autoSnapshot: false }) {
  const gateway = createFakeGateway({ autoOpen: false, autoWelcome: false, ...replies });
  const onReconnect = vi.fn();
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    random: () => 1,
    onWarning: () => {},
  });
  client.subscribeReconnect(onReconnect);
  return { gateway, client, onReconnect };
}

function connectFirstThenReconnect(
  gateway: ReturnType<typeof setup>["gateway"],
  client: ReturnType<typeof setup>["client"],
  symbols: readonly string[],
) {
  client.start();
  const first = gateway.latestConnection();
  first.open();
  first.sendWelcome();
  first.deliverHeldReplies();
  first.sendSnapshot(symbols.map((symbol, index) => makeQuote(symbol, "100.00", 1_000 + index)));
  expect(client.getStatus()).toBe("connected");
  first.drop();
  expect(client.getStatus()).toBe("stale");
  vi.advanceTimersByTime(500);
  const second = gateway.latestConnection();
  expect(gateway.connections).toHaveLength(2);
  second.open();
  second.sendWelcome();
  return second;
}

describe("recovery gate after a reconnect", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for a symbol referenced after welcome even when another snapshot lands first", () => {
    const { gateway, client, onReconnect } = setup();
    client.acquireSymbol("AAPL");
    const conn = connectFirstThenReconnect(gateway, client, ["AAPL"]);
    expect(conn.sentMessages).toEqual([{ type: "subscribe", requestId: 1, symbols: ["AAPL"] }]);

    client.acquireSymbol("MSFT");
    conn.sendSnapshot([makeQuote("AAPL", "191.00", 2_000)]);
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(200);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
    ]);
    expect(client.getStatus()).toBe("stale");
    expect(onReconnect).not.toHaveBeenCalled();

    conn.sendSnapshot([makeQuote("MSFT", "421.00", 2_001)]);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it("keeps waiting for a symbol released while pending and reacquired within 2 s", () => {
    const { gateway, client, onReconnect } = setup();
    const releaseAapl = client.acquireSymbol("AAPL");
    client.acquireSymbol("MSFT");
    const conn = connectFirstThenReconnect(gateway, client, ["AAPL", "MSFT"]);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
    ]);

    releaseAapl();
    vi.advanceTimersByTime(1_000);
    client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(2_000);
    expect(conn.sentMessages).toHaveLength(1);
    expect(client.getStatus()).toBe("stale");

    conn.sendSnapshot([makeQuote("AAPL", "191.00", 2_001), makeQuote("MSFT", "421.00", 2_000)]);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it("treats a symbol the reply leaves out as unavailable and settles it", () => {
    const { gateway, client, onReconnect } = setup();
    client.acquireSymbol("AAPL");
    client.acquireSymbol("MSFT");
    const conn = connectFirstThenReconnect(gateway, client, ["AAPL", "MSFT"]);

    conn.sendSymbolError("unavailable", ["AAPL"]);
    expect(client.getStatus()).toBe("stale");
    conn.sendSnapshot([]);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(9_000);
    conn.sendQuotes([makeQuote("MSFT", "422.00", 3_000)]);
    vi.advanceTimersByTime(2_000);
    expect(conn.sentMessages).toHaveLength(1);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("counts a typed rejection once its snapshot arrives and ignores symbols released for good", () => {
    const { gateway, client, onReconnect } = setup();
    client.acquireSymbol("AAPL");
    const releaseMsft = client.acquireSymbol("MSFT");
    const conn = connectFirstThenReconnect(gateway, client, ["AAPL", "MSFT"]);
    client.acquireSymbol("NOPE");
    vi.advanceTimersByTime(200);

    conn.sendSymbolError("unknown_symbol", ["NOPE"], 2);
    releaseMsft();
    expect(client.getStatus()).toBe("stale");

    conn.sendSnapshot([makeQuote("AAPL", "191.00", 2_000)], 1);
    expect(client.getStatus()).toBe("stale");
    conn.sendSnapshot([], 2);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it("ignores a reply to a subscribe superseded by an unsubscribe and a new subscribe", () => {
    const { gateway, client, onReconnect } = setup({ holdReplies: true });
    const releaseAapl = client.acquireSymbol("AAPL");
    const conn = connectFirstThenReconnect(gateway, client, []);
    client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(200);

    releaseAapl();
    vi.advanceTimersByTime(2_000);
    conn.deliverHeldReplies(1);
    expect(client.getStatus()).toBe("stale");

    client.acquireSymbol("AAPL");
    vi.advanceTimersByTime(200);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: ["AAPL"] },
      { type: "subscribe", requestId: 2, symbols: ["MSFT"] },
      { type: "unsubscribe", symbols: ["AAPL"] },
      { type: "subscribe", requestId: 3, symbols: ["AAPL"] },
    ]);
    conn.deliverHeldReplies(1);
    expect(client.getStatus()).toBe("stale");
    expect(onReconnect).not.toHaveBeenCalled();

    conn.deliverHeldReplies(1);
    expect(client.getStatus()).toBe("connected");
    expect(onReconnect).toHaveBeenCalledTimes(1);
    client.stop();
  });

  it("ignores a superseded rejection and waits for the current request", () => {
    const { gateway, client } = setup({ holdReplies: true, maxSubscriptions: 1 });
    client.acquireSymbol("AAPL");
    const releaseMsft = client.acquireSymbol("MSFT");
    const conn = connectFirstThenReconnect(gateway, client, []);

    releaseMsft();
    vi.advanceTimersByTime(2_000);
    client.acquireSymbol("MSFT");
    vi.advanceTimersByTime(200);
    conn.deliverHeldReplies(1);
    expect(client.getStatus()).toBe("stale");

    conn.deliverHeldReplies(1);
    expect(client.getStatus()).toBe("connected");
    expect(conn.sentMessages).toHaveLength(3);
    client.stop();
  });
});

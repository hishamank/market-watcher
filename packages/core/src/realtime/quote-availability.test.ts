import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const gateway = createFakeGateway({ autoSnapshot: false });
  const store = createQuoteStore();
  store.upsert(makeQuote("AAPL", "100.00", 1000));
  store.upsert(makeQuote("MSFT", "200.00", 1000));
  const client = createSocketClient({
    url: "ws://gateway.test/ws?v=1",
    quoteStore: store,
    network: createFakeNetwork(),
    socketFactory: gateway.socketFactory,
    onWarning: () => {},
    random: () => 1,
  });
  client.acquireSymbol("AAPL");
  client.acquireSymbol("MSFT");
  client.start();
  vi.advanceTimersByTime(1);
  return { client, store, gateway, conn: gateway.latestConnection() };
}

it("keeps transport connected while unavailable data stays degraded until a valid quote", () => {
  const { client, store, conn } = setup();
  try {
    conn.sendSymbolError("unavailable", ["AAPL"], 1);
    conn.sendSnapshot([makeQuote("MSFT", "201.00", 2000)], 1);
    expect(client.getStatus()).toBe("connected");
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    expect(store.getAvailability("MSFT")).toBe("available");
    conn.sendQuotes([makeQuote("AAPL", "99.00", 999)]);
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    conn.sendQuotes([makeQuote("AAPL", "100.00", 1000)]);
    expect(store.getAvailability("AAPL")).toBe("available");
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(5000);
      conn.sendHeartbeat();
    }
    expect(store.getAvailability("AAPL")).toBe("available");
  } finally {
    client.stop();
  }
});

it("marks missing and capacity-refused symbols and ignores superseded errors", () => {
  const { client, store, conn } = setup();
  try {
    conn.sendSymbolError("subscription_limit", ["AAPL"], 1);
    conn.sendSnapshot([], 1);
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    expect(store.getAvailability("MSFT")).toBe("unavailable");
    conn.sendQuotes([makeQuote("MSFT", "201.00", 2000)]);
    conn.sendSymbolError("unavailable", ["MSFT"], 999);
    conn.sendSnapshot([], 999);
    expect(store.getAvailability("MSFT")).toBe("available");
  } finally {
    client.stop();
  }
});

it("recovers after a gateway restart without pretending an empty snapshot refreshed data", () => {
  const { client, store, gateway, conn } = setup();
  try {
    conn.sendSnapshot([makeQuote("AAPL", "100.00", 1000), makeQuote("MSFT", "200.00", 1000)], 1);
    conn.drop();
    vi.advanceTimersByTime(501);
    const next = gateway.latestConnection();
    next.sendSnapshot([], 1);
    expect(client.getStatus()).toBe("connected");
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    next.sendQuotes([makeQuote("AAPL", "101.00", 2000)]);
    expect(store.getAvailability("AAPL")).toBe("available");
  } finally {
    client.stop();
  }
});

it("REST and cache writes cannot hide a refused live subscription", () => {
  const { client, store, conn } = setup();
  try {
    conn.sendSymbolError("subscription_limit", ["AAPL"], 1);
    conn.sendSnapshot([], 1);
    store.beginRestRead()([makeQuote("AAPL", "105.00", 3000)]);
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    conn.sendQuotes([makeQuote("AAPL", "105.00", 3000)]);
    expect(store.getAvailability("AAPL")).toBe("available");
  } finally {
    client.stop();
  }
});

it("an outdated snapshot cannot confirm freshness and a tick ahead of its reply remains healthy", () => {
  const { client, store, conn } = setup();
  try {
    conn.sendQuotes([makeQuote("MSFT", "201.00", 2000)]);
    conn.sendSnapshot([makeQuote("AAPL", "99.00", 999)], 1);
    expect(store.getAvailability("AAPL")).toBe("unavailable");
    expect(store.getAvailability("MSFT")).toBe("available");
  } finally {
    client.stop();
  }
});

it("a snapshot for an unknown request cannot hide an unavailable subscription", () => {
  const { client, store, conn } = setup();
  try {
    conn.sendSnapshot([], 1);
    conn.sendSnapshot([makeQuote("AAPL", "101.00", 2000)], 999);
    expect(store.getQuote("AAPL")?.price).toBe("101.00");
    expect(store.getAvailability("AAPL")).toBe("unavailable");
  } finally {
    client.stop();
  }
});

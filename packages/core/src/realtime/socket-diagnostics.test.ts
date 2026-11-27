import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork, makeQuote } from "../testing/fake-platform.ts";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const gateway = createFakeGateway({ autoSnapshot: false });
  const store = createQuoteStore();
  const network = createFakeNetwork();
  const client = createSocketClient({
    url: "ws://gateway.test/ws?v=1",
    quoteStore: store,
    network,
    socketFactory: gateway.socketFactory,
    onWarning: () => {},
    random: () => 1,
  });
  client.acquireSymbol("AAPL");
  client.start();
  vi.advanceTimersByTime(1);
  return { client, network, conn: gateway.latestConnection() };
}

it("distinguishes settled transport from unavailable symbols and reports request deadlines", () => {
  const { client, conn } = setup();
  try {
    const pending = client.getDiagnostics();
    expect(pending.handshakeComplete).toBe(true);
    expect(pending.recoverySettled).toBe(false);
    expect(pending.pendingSubscriptions).toEqual([
      { requestId: 1, symbols: ["AAPL"], deadlineAt: Date.now() + 9999, isResend: false },
    ]);
    conn.sendRaw(
      JSON.stringify({
        type: "error",
        code: "unavailable",
        symbols: ["AAPL"],
        requestId: 1,
        message: "private-upstream-detail",
      }),
    );
    conn.sendSnapshot([], 1);
    expect(client.getDiagnostics()).toMatchObject({
      transportStatus: "connected",
      recoverySettled: true,
      pendingSubscriptions: [],
      symbols: [{ symbol: "AAPL", availability: "unavailable" }],
      lastGatewayError: { code: "unavailable", symbols: ["AAPL"] },
    });
    expect(JSON.stringify(client.getDiagnostics())).not.toContain("private-upstream-detail");
    conn.sendQuotes([makeQuote("AAPL", "100.00", Date.now())]);
    expect(client.getDiagnostics().symbols[0]?.availability).toBe("available");
  } finally {
    client.stop();
  }
});

it("reports local queue depth and clears pending work when the network is lost", () => {
  const { client, network } = setup();
  try {
    for (let i = 0; i < 12; i++) client.send({ type: "chaos", action: "drop" });
    expect(client.getDiagnostics().queuedMessages).toBeGreaterThan(0);
    network.setState("offline");
    expect(client.getDiagnostics()).toMatchObject({
      transportStatus: "offline",
      socketOpen: false,
      handshakeComplete: false,
      recoverySettled: false,
      queuedMessages: 0,
      pendingSubscriptions: [],
      lastRecoveryReason: "network_offline",
    });
  } finally {
    client.stop();
  }
});

it("records silence recovery without retaining mutable diagnostic snapshots", () => {
  const { client, conn } = setup();
  try {
    const snapshot = client.getDiagnostics();
    Reflect.set(snapshot.pendingSubscriptions[0]?.symbols ?? [], "length", 0);
    expect(client.getDiagnostics().pendingSubscriptions[0]?.symbols).toEqual(["AAPL"]);
    conn.sendSnapshot([makeQuote("AAPL", "100.00", Date.now())], 1);
    vi.advanceTimersByTime(10_000);
    expect(client.getDiagnostics().lastRecoveryReason).toBe("silence_timeout");
  } finally {
    client.stop();
  }
});

it("identifies exhausted subscription deadlines separately from a silent transport", () => {
  const { client, conn } = setup();
  try {
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(4999);
      conn.sendHeartbeat();
    }
    expect(client.getDiagnostics().pendingSubscriptions[0]?.isResend).toBe(true);
    vi.advanceTimersByTime(5);
    expect(client.getDiagnostics()).toMatchObject({
      lastRecoveryReason: "subscription_deadline",
      pendingSubscriptions: [],
      recoverySettled: false,
    });
  } finally {
    client.stop();
  }
});

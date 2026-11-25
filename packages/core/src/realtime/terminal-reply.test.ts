import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore, createSocketClient, type ConnectionStatus } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork } from "../testing/fake-platform.ts";

const SYMBOLS = ["AAPL", "NOPE", "MSFT"];

function setup() {
  const gateway = createFakeGateway({ holdReplies: true });
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    random: () => 1,
    onWarning: () => {},
  });
  const statuses: ConnectionStatus[] = [];
  client.subscribeStatus(() => statuses.push(client.getStatus()));
  SYMBOLS.forEach((symbol) => client.acquireSymbol(symbol));
  client.start();
  vi.advanceTimersByTime(0);
  return { gateway, client, statuses, conn: gateway.latestConnection() };
}

type Connection = ReturnType<typeof setup>["conn"];

function answerEverySymbolWithAnError(conn: Connection, requestId: number): void {
  conn.discardReply(requestId);
  conn.sendSymbolError("unavailable", ["AAPL"], requestId);
  conn.sendSymbolError("unknown_symbol", ["NOPE"], requestId);
  conn.sendSymbolError("subscription_limit", ["MSFT"], requestId);
}

function advanceWithHeartbeats(conn: Connection, ms: number): void {
  for (let elapsed = 0; elapsed < ms; elapsed += 1_000) {
    vi.advanceTimersByTime(Math.min(1_000, ms - elapsed));
    conn.sendHeartbeat();
  }
}

describe("only the terminal reply settles a subscribe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resends at 10 s and reconnects at 20 s when symbol errors arrive without a snapshot", () => {
    const { gateway, client, statuses, conn } = setup();
    answerEverySymbolWithAnError(conn, 1);
    expect(client.getStatus()).toBe("connecting");

    advanceWithHeartbeats(conn, 10_000);
    expect(conn.sentMessages).toEqual([
      { type: "subscribe", requestId: 1, symbols: SYMBOLS },
      { type: "subscribe", requestId: 2, symbols: SYMBOLS },
    ]);
    answerEverySymbolWithAnError(conn, 2);
    expect(client.getStatus()).toBe("connecting");

    advanceWithHeartbeats(conn, 9_000);
    expect(conn.socket.readyState).toBe(1);
    advanceWithHeartbeats(conn, 1_000);
    expect(conn.socket.readyState).toBe(3);
    expect(client.getStatus()).toBe("stale");
    vi.advanceTimersByTime(501);
    expect(gateway.connections).toHaveLength(2);
    expect(statuses).not.toContain("connected");
    client.stop();
  });

  it("settles once when the snapshot follows the symbol errors", () => {
    const { gateway, client, statuses, conn } = setup();
    answerEverySymbolWithAnError(conn, 1);
    expect(client.getStatus()).toBe("connecting");

    conn.sendSnapshot([], 1);
    expect(client.getStatus()).toBe("connected");
    conn.sendSnapshot([], 1);
    advanceWithHeartbeats(conn, 21_000);
    expect(statuses.filter((status) => status === "connected")).toHaveLength(1);
    expect(client.getStatus()).toBe("connected");
    expect(conn.sentMessages).toHaveLength(1);
    expect(gateway.connections).toHaveLength(1);
    client.stop();
  });
});

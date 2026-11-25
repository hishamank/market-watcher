import type { ChaosMessage } from "@mini/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "./quote-store.ts";
import { createSocketClient } from "./socket-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeNetwork } from "../testing/fake-platform.ts";

const ACTIONS = ["freeze", "tick_spike", "history_latency", "force_closed"] as const;

function chaosAt(index: number): ChaosMessage {
  if (index % 5 === 4) return { type: "chaos", action: "history_failure_rate", rate: 50 };
  return { type: "chaos", action: ACTIONS[index % 4]!, enabled: index % 2 === 0 };
}

function connectedClient() {
  const gateway = createFakeGateway();
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network: createFakeNetwork("online"),
    socketFactory: gateway.socketFactory,
    random: () => 1,
    onWarning: () => {},
  });
  client.start();
  vi.advanceTimersByTime(0);
  const conn = gateway.latestConnection();
  const sentAt: number[] = [];
  const send = conn.socket.send.bind(conn.socket);
  conn.socket.send = (data) => {
    sentAt.push(Date.now());
    send(data);
  };
  return { client, conn, sentAt };
}

describe("every outbound message shares one budget per connection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("paces public sends with subscription traffic and keeps their order", () => {
    const { client, conn, sentAt } = connectedClient();
    const releases = ["AAPL", "MSFT", "NVDA"].map((symbol) => client.acquireSymbol(symbol));
    const chaos = Array.from({ length: 30 }, (_, index) => chaosAt(index));
    expect(chaos.map((message) => client.send(message))).toEqual(chaos.map(() => true));
    for (let step = 0; step < 20; step += 1) {
      releases.push(client.acquireSymbol(`S${step}`));
      releases[step]?.();
      vi.advanceTimersByTime(150);
    }
    vi.advanceTimersByTime(10_000);

    expect(conn.sentMessages.filter((message) => message.type === "chaos")).toEqual(chaos);
    expect(sentAt.length).toBeGreaterThan(40);
    for (const start of sentAt) {
      expect(
        sentAt.filter((time) => time >= start && time < start + 1_000).length,
      ).toBeLessThanOrEqual(10);
    }
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("counts the time each write takes against the window", () => {
    const { client, conn, sentAt } = connectedClient();
    const send = conn.socket.send.bind(conn.socket);
    let writes = 0;
    conn.socket.send = (data) => {
      writes += 1;
      if (writes > 10 && writes <= 20) vi.setSystemTime(Date.now() + 3);
      send(data);
    };
    const chaos = Array.from({ length: 25 }, (_, index) => chaosAt(index));
    chaos.forEach((message) => client.send(message));
    vi.advanceTimersByTime(5_000);

    expect(conn.sentMessages.filter((message) => message.type === "chaos")).toEqual(chaos);
    for (const start of sentAt) {
      expect(
        sentAt.filter((time) => time >= start && time < start + 1_000).length,
      ).toBeLessThanOrEqual(10);
    }
    client.stop();
  });

  it("drops queued messages when the connection closes", () => {
    const { client, conn } = connectedClient();
    const chaos = Array.from({ length: 15 }, (_, index) => chaosAt(index));
    chaos.forEach((message) => client.send(message));
    expect(conn.sentMessages).toHaveLength(10);
    client.stop();
    vi.advanceTimersByTime(2_000);
    expect(conn.sentMessages).toHaveLength(10);
    expect(client.send(chaos[0]!)).toBe(false);
  });
});

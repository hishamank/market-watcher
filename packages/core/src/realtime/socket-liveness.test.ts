import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore, createSocketClient } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeLifecycle, createFakeNetwork } from "../testing/fake-platform.ts";

describe("socket liveness, offline, errors and lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("becomes stale after 10 s of silence on default 5 s heartbeat and recovers", () => {
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
    expect(client.getStatus()).toBe("connected");

    vi.advanceTimersByTime(9_999);
    expect(client.getStatus()).toBe("connected");
    vi.advanceTimersByTime(1);
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(1);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("uses heartbeatIntervalMs from welcome and resets silence on any valid message", () => {
    const gateway = createFakeGateway({ heartbeatIntervalMs: 3_000 });
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
    expect(client.getStatus()).toBe("connected");

    vi.advanceTimersByTime(5_000);
    expect(client.getStatus()).toBe("connected");
    gateway.latestConnection().sendHeartbeat();

    vi.advanceTimersByTime(5_999);
    expect(client.getStatus()).toBe("connected");
    vi.advanceTimersByTime(1);
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(1);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("suppresses retries while offline and reconnects at once when back online", () => {
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
    expect(client.getStatus()).toBe("connected");

    network.setState("offline");
    expect(client.getStatus()).toBe("offline");
    client.retryNow();
    vi.advanceTimersByTime(60_000);
    expect(gateway.connections).toHaveLength(1);

    network.setState("online");
    expect(gateway.connections).toHaveLength(2);
    expect(client.getStatus()).toBe("stale");
    vi.advanceTimersByTime(0);
    expect(client.getStatus()).toBe("connected");

    gateway.latestConnection().drop();
    expect(client.getStatus()).toBe("stale");
    network.setState("offline");
    expect(client.getStatus()).toBe("offline");
    vi.advanceTimersByTime(60_000);
    expect(gateway.connections).toHaveLength(2);

    client.stop();
  });

  it("starts offline without opening a socket and connects once online", () => {
    const gateway = createFakeGateway();
    const network = createFakeNetwork("offline");
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      socketFactory: gateway.socketFactory,
      onWarning: () => {},
    });

    client.start();
    expect(client.getStatus()).toBe("offline");
    vi.advanceTimersByTime(60_000);
    expect(gateway.connections).toHaveLength(0);

    network.setState("online");
    expect(client.getStatus()).toBe("connecting");
    expect(gateway.connections).toHaveLength(1);
    vi.advanceTimersByTime(0);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("drops invalid frames, settles partial errors, and honors background grace", () => {
    const warnings: unknown[] = [];
    const gateway = createFakeGateway({ unknownSymbols: ["NOPE"] });
    const network = createFakeNetwork("online");
    const lifecycle = createFakeLifecycle("foreground");
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network,
      lifecycle,
      socketFactory: gateway.socketFactory,
      onWarning: (message, detail) => warnings.push([message, detail]),
    });

    client.acquireSymbol("AAPL");
    client.acquireSymbol("NOPE");
    client.start();
    vi.advanceTimersByTime(0);
    expect(client.getStatus()).toBe("connected");

    gateway.latestConnection().sendRaw("not json");
    gateway.latestConnection().sendRaw(JSON.stringify({ type: "unknown_kind" }));
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    expect(client.getStatus()).toBe("connected");

    lifecycle.setState("background");
    vi.advanceTimersByTime(5_000);
    gateway.latestConnection().sendHeartbeat();
    vi.advanceTimersByTime(4_999);
    lifecycle.setState("foreground");
    vi.advanceTimersByTime(2_000);
    expect(gateway.connections).toHaveLength(1);

    gateway.latestConnection().sendHeartbeat();
    lifecycle.setState("background");
    vi.advanceTimersByTime(5_000);
    gateway.latestConnection().sendHeartbeat();
    vi.advanceTimersByTime(5_000);
    lifecycle.setState("foreground");
    expect(gateway.connections).toHaveLength(2);

    client.stop();
  });
});

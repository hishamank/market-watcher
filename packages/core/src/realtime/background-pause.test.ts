import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuoteStore, createSocketClient, SOCKET_READY_STATE } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import { createFakeLifecycle, createFakeNetwork } from "../testing/fake-platform.ts";

function setup() {
  const gateway = createFakeGateway();
  const network = createFakeNetwork("online");
  const lifecycle = createFakeLifecycle("foreground");
  const client = createSocketClient({
    url: "ws://localhost:4000/ws?v=1",
    quoteStore: createQuoteStore(),
    network,
    lifecycle,
    socketFactory: gateway.socketFactory,
    onWarning: () => {},
  });
  client.start();
  vi.advanceTimersByTime(0);
  expect(client.getStatus()).toBe("connected");
  return { gateway, network, lifecycle, client };
}

describe("background grace closes the socket", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks a healthy connection stale and keeps retries paused until foreground", () => {
    const { gateway, network, lifecycle, client } = setup();

    lifecycle.setState("background");
    vi.advanceTimersByTime(5_000);
    gateway.latestConnection().sendHeartbeat();
    vi.advanceTimersByTime(5_000);
    expect(gateway.latestConnection().socket.readyState).toBe(SOCKET_READY_STATE.CLOSED);
    expect(client.getStatus()).toBe("stale");

    vi.advanceTimersByTime(60_000);
    client.retryNow();
    expect(gateway.connections).toHaveLength(1);

    network.setState("offline");
    expect(client.getStatus()).toBe("offline");
    network.setState("online");
    expect(client.getStatus()).toBe("stale");
    vi.advanceTimersByTime(60_000);
    expect(gateway.connections).toHaveLength(1);

    lifecycle.setState("foreground");
    expect(gateway.connections).toHaveLength(2);
    vi.advanceTimersByTime(0);
    expect(client.getStatus()).toBe("connected");
    client.stop();
  });

  it("keeps offline when the grace closes the socket while offline", () => {
    const { gateway, network, lifecycle, client } = setup();

    network.setState("offline");
    lifecycle.setState("background");
    vi.advanceTimersByTime(10_000);
    expect(client.getStatus()).toBe("offline");
    expect(gateway.connections).toHaveLength(1);
    client.stop();
  });
});

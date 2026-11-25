import { useContext, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectionHealth } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { defaultQuoteFor } from "../testing/fake-gateway-types.ts";
import { createFakeGateway, type FakeGatewayOptions } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useContext: vi.fn(), useEffect: vi.fn(), useState: vi.fn() };
});

const START = 1_764_000_000_000;

function launch(options: FakeGatewayOptions = {}) {
  const gateway = createFakeGateway(options);
  const services = createCoreServices({
    gatewayUrl: "http://localhost:4000",
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: gateway.socketFactory,
  });
  services.socketClient.start();
  vi.advanceTimersByTime(0);
  return { gateway, services, health: () => services.health.snapshot() };
}

function quoteAt(timestamp: number) {
  return { ...defaultQuoteFor("AAPL"), timestamp };
}

describe("connection health counters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts a reconnect after the gateway drops the connection", () => {
    const { gateway, services, health } = launch();
    expect(services.socketClient.getStatus()).toBe("connected");
    expect(health().reconnects).toBe(0);

    gateway.latestConnection().drop();
    expect(services.socketClient.getStatus()).toBe("stale");
    vi.advanceTimersByTime(1_000);
    expect(services.socketClient.getStatus()).toBe("connected");
    expect(health().reconnects).toBe(1);

    gateway.latestConnection().drop();
    vi.advanceTimersByTime(2_000);
    expect(health().reconnects).toBe(2);
    services.socketClient.stop();
  });

  it("reports quotes frames per second over the window and falls to zero when they stop", () => {
    const { gateway, services, health } = launch();
    expect(health().framesPerSecond).toBe(0);

    for (let frame = 0; frame < 20; frame += 1) {
      vi.advanceTimersByTime(250);
      gateway.latestConnection().sendQuotes([quoteAt(Date.now())]);
    }
    gateway.latestConnection().sendSnapshot([quoteAt(Date.now())], 1);
    expect(health().framesPerSecond).toBe(4);

    vi.advanceTimersByTime(5_000);
    expect(health()).toMatchObject({ framesPerSecond: 0, latencyMs: null });
    services.socketClient.stop();
  });

  it("corrects tick latency with the welcome's server time", () => {
    const skewMs = 30_000;
    const { gateway, services, health } = launch({ autoWelcome: false });
    gateway.latestConnection().sendWelcome({ serverTime: Date.now() + skewMs });
    expect(health().latencyMs).toBeNull();

    gateway.latestConnection().sendQuotes([quoteAt(Date.now() + skewMs - 120)]);
    vi.advanceTimersByTime(250);
    gateway.latestConnection().sendQuotes([quoteAt(Date.now() + skewMs - 80)]);
    expect(health().latencyMs).toBe(100);
    services.socketClient.stop();
  });

  it("takes a better clock offset from a heartbeat when the welcome was handled late", () => {
    const skewMs = 30_000;
    const { gateway, services, health } = launch({ autoWelcome: false });
    const connection = gateway.latestConnection();
    connection.sendWelcome({ serverTime: Date.now() + skewMs - 400 });
    connection.sendServerMessage({ type: "heartbeat", serverTime: Date.now() + skewMs });
    connection.sendQuotes([quoteAt(Date.now() + skewMs - 120)]);
    expect(health().latencyMs).toBe(120);
    services.socketClient.stop();
  });

  it("shows the latest heartbeat's skipped frames", () => {
    const { gateway, services, health } = launch();
    expect(health().skippedFrames).toBeNull();

    gateway.latestConnection().sendHeartbeat(0);
    expect(health().skippedFrames).toBe(0);
    gateway.latestConnection().sendHeartbeat(7);
    expect(health().skippedFrames).toBe(7);
    gateway.latestConnection().sendHeartbeat();
    expect(health().skippedFrames).toBe(7);
    services.socketClient.stop();
  });

  it("clears the old connection's skipped frames on a new welcome", () => {
    const { gateway, services, health } = launch();
    gateway.latestConnection().sendHeartbeat(20);
    expect(health().skippedFrames).toBe(20);

    gateway.latestConnection().drop();
    vi.advanceTimersByTime(1_000);
    expect(services.socketClient.getStatus()).toBe("connected");
    expect(health()).toMatchObject({ reconnects: 1, skippedFrames: null });

    gateway.latestConnection().sendHeartbeat(0);
    expect(health().skippedFrames).toBe(0);
    services.socketClient.stop();
  });

  it("keeps counters per provider instance", () => {
    const first = launch();
    const second = launch();
    first.gateway.latestConnection().sendHeartbeat(5);
    expect(first.health().skippedFrames).toBe(5);
    expect(second.health().skippedFrames).toBeNull();
    first.services.socketClient.stop();
    second.services.socketClient.stop();
  });
});

describe("useConnectionHealth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("first renders what the server rendered, then refreshes once a second", () => {
    const { gateway, services } = launch();
    gateway.latestConnection().sendHeartbeat(3);
    const setCurrent = vi.fn();
    const cleanups: Array<() => void> = [];
    vi.mocked(useContext).mockReturnValue(services);
    const reactState = (initial: unknown) => [
      typeof initial === "function" ? initial() : initial,
      setCurrent,
    ];
    vi.mocked(useState).mockImplementation(reactState as never);
    vi.mocked(useEffect).mockImplementation((effect) => {
      const cleanup = effect();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    });

    expect(useConnectionHealth()).toEqual({
      reconnects: 0,
      framesPerSecond: 0,
      latencyMs: null,
      skippedFrames: null,
    });
    expect(setCurrent).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(setCurrent).toHaveBeenCalledTimes(1);
    expect(setCurrent).toHaveBeenLastCalledWith(expect.objectContaining({ skippedFrames: 3 }));

    for (let frame = 0; frame < 4; frame += 1) {
      gateway.latestConnection().sendQuotes([quoteAt(Date.now())]);
      vi.advanceTimersByTime(250);
    }
    expect(setCurrent).toHaveBeenCalledTimes(2);
    expect(setCurrent).toHaveBeenLastCalledWith(expect.objectContaining({ framesPerSecond: 0.8 }));

    cleanups.forEach((cleanup) => cleanup());
    vi.advanceTimersByTime(5_000);
    expect(setCurrent).toHaveBeenCalledTimes(2);
    services.socketClient.stop();
  });
});

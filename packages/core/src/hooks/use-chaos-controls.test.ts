import { useContext, useEffect, useState, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreServices, useChaosControls } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: <T>(callback: T) => callback,
    useContext: vi.fn(),
    useEffect: vi.fn(),
    useState: vi.fn(),
    useSyncExternalStore: vi.fn(),
  };
});

describe("useChaosControls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_764_000_000_000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks chaos_state countdowns using serverTime and sends chaos actions", () => {
    const gateway = createFakeGateway();
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gateway.socketFactory,
    });

    let nowState = 0;
    const cleanups: Array<() => void> = [];
    vi.mocked(useContext).mockReturnValue(services);
    vi.mocked(useState).mockImplementation(() => [
      nowState,
      (next: unknown) => {
        nowState =
          typeof next === "function"
            ? (next as (prev: number) => number)(nowState)
            : (next as number);
      },
    ]);
    vi.mocked(useEffect).mockImplementation((effect) => {
      const cleanup = effect();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    });
    vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());

    services.socketClient.start();
    vi.advanceTimersByTime(0);

    const initial = useChaosControls();
    expect(initial.tickSpike).toEqual({ enabled: false, secondsLeft: null });
    expect(initial.historyFailureRate).toEqual({ rate: 0, secondsLeft: null });

    const serverClock = 1_764_000_500_000;
    gateway.latestConnection().sendServerMessage({
      type: "chaos_state",
      serverTime: serverClock,
      tickSpike: { enabled: true, revertsAt: serverClock + 60_000 },
      historyLatency: { enabled: false, revertsAt: null },
      historyFailureRate: { rate: 50, revertsAt: serverClock + 30_000 },
      forceClosed: { enabled: false, revertsAt: null },
    });

    const active = useChaosControls();
    expect(active.tickSpike).toEqual({ enabled: true, secondsLeft: 60 });
    expect(active.historyFailureRate).toEqual({ rate: 50, secondsLeft: 30 });

    vi.advanceTimersByTime(12_000);
    const later = useChaosControls();
    expect(later.tickSpike).toEqual({ enabled: true, secondsLeft: 48 });
    expect(later.historyFailureRate).toEqual({ rate: 50, secondsLeft: 18 });

    later.dropConnection();
    later.freezeFeed();
    later.setTickSpike(false);
    later.setHistoryLatency(true);
    later.setHistoryFailureRate(100);
    later.setForceClosed(true);

    expect(gateway.latestConnection().sentMessages).toEqual([
      { type: "chaos", action: "drop" },
      { type: "chaos", action: "freeze", enabled: true },
      { type: "chaos", action: "tick_spike", enabled: false },
      { type: "chaos", action: "history_latency", enabled: true },
      { type: "chaos", action: "history_failure_rate", rate: 100 },
      { type: "chaos", action: "force_closed", enabled: true },
    ]);

    cleanups.forEach((cleanup) => cleanup());
    services.socketClient.stop();
  });

  it("keeps chaos state isolated across separate provider instances", () => {
    const gatewayA = createFakeGateway();
    const gatewayB = createFakeGateway();
    const instanceA = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gatewayA.socketFactory,
    });
    const instanceB = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gatewayB.socketFactory,
    });

    instanceA.socketClient.start();
    instanceB.socketClient.start();
    vi.advanceTimersByTime(0);

    gatewayA.latestConnection().sendServerMessage({
      type: "chaos_state",
      serverTime: 1_764_000_000_000,
      tickSpike: { enabled: true, revertsAt: 1_764_000_060_000 },
      historyLatency: { enabled: false, revertsAt: null },
      historyFailureRate: { rate: 0, revertsAt: null },
      forceClosed: { enabled: false, revertsAt: null },
    });

    expect(instanceA.socketClient.getChaosState()?.tickSpike.enabled).toBe(true);
    expect(instanceB.socketClient.getChaosState()).toBeNull();

    instanceA.socketClient.stop();
    instanceB.socketClient.stop();
  });
});

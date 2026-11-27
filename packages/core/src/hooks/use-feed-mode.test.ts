import type { FeedMode } from "@mini/contracts";
import { useContext, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFeedMode } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
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
    useSyncExternalStore: vi.fn(),
  };
});

function servicesFor(gateway: ReturnType<typeof createFakeGateway>) {
  return createCoreServices({
    gatewayUrl: "http://localhost:4000",
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: gateway.socketFactory,
  });
}

describe("useFeedMode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is null until the welcome, then reports the feed mode once", () => {
    const gateway = createFakeGateway({ autoWelcome: false, feedMode: "live" });
    const services = servicesFor(gateway);
    vi.mocked(useContext).mockReturnValue(services);

    expect(useFeedMode()).toBeNull();
    const [subscribe, , getServerSnapshot] = vi.mocked(useSyncExternalStore).mock.calls[0] ?? [];
    expect(getServerSnapshot?.()).toBeNull();

    const observed: Array<FeedMode | null> = [];
    const unsubscribe = subscribe?.(() => observed.push(services.socketClient.getFeedMode()));

    services.socketClient.start();
    vi.advanceTimersByTime(0);
    expect(useFeedMode()).toBeNull();

    gateway.latestConnection().sendWelcome();
    expect(useFeedMode()).toBe("live");
    expect(observed).toEqual(["live"]);

    unsubscribe?.();
    services.socketClient.stop();
  });

  it("keeps the first feed mode across a reconnect and a conflicting welcome", () => {
    const gateway = createFakeGateway({ autoWelcome: false, feedMode: "simulated" });
    const services = servicesFor(gateway);
    vi.mocked(useContext).mockReturnValue(services);

    services.socketClient.start();
    vi.advanceTimersByTime(0);
    gateway.latestConnection().sendWelcome();
    expect(useFeedMode()).toBe("simulated");

    const [subscribe] = vi.mocked(useSyncExternalStore).mock.calls[0] ?? [];
    const listener = vi.fn();
    const unsubscribe = subscribe?.(listener);

    gateway.latestConnection().drop();
    expect(useFeedMode()).toBe("simulated");
    vi.advanceTimersByTime(10_000);
    expect(gateway.connections.length).toBe(2);

    gateway.latestConnection().sendWelcome({ feedMode: "live" });
    expect(useFeedMode()).toBe("simulated");
    expect(listener).not.toHaveBeenCalled();

    unsubscribe?.();
    services.socketClient.stop();
  });
});

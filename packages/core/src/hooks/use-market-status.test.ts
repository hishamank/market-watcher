import type { MarketStatus } from "@mini/contracts";
import { useContext, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMarketStatus } from "../index.ts";
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

describe("useMarketStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("follows welcome and then market_status messages from the fake gateway", () => {
    const gateway = createFakeGateway({ autoWelcome: false, marketStatus: "open" });
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gateway.socketFactory,
    });

    vi.mocked(useContext).mockReturnValue(services);
    vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());

    const observed: Array<MarketStatus | null> = [];
    expect(useMarketStatus()).toBeNull();

    const [subscribe, getSnapshot, getServerSnapshot] =
      vi.mocked(useSyncExternalStore).mock.calls[0] ?? [];
    expect(getSnapshot?.()).toBeNull();
    expect(getServerSnapshot?.()).toBeNull();

    const unsubscribe = subscribe?.(() => {
      observed.push(services.socketClient.getMarketStatus());
    });

    services.socketClient.start();
    vi.advanceTimersByTime(0);

    gateway.latestConnection().sendWelcome({ marketStatus: "open" });
    expect(useMarketStatus()).toBe("open");

    gateway.latestConnection().sendMarketStatus("closed");
    expect(useMarketStatus()).toBe("closed");

    gateway.latestConnection().sendMarketStatus("closed");
    gateway.latestConnection().sendMarketStatus("open");
    expect(useMarketStatus()).toBe("open");

    expect(observed).toEqual(["open", "closed", "open"]);

    unsubscribe?.();
    services.socketClient.stop();
  });

  it("uses initialStatus before welcome and lets live socket updates override it", () => {
    const gateway = createFakeGateway({ autoWelcome: false });
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gateway.socketFactory,
    });

    vi.mocked(useContext).mockReturnValue(services);
    vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());

    expect(useMarketStatus("open")).toBe("open");
    const [, , getServerSnapshot] = vi.mocked(useSyncExternalStore).mock.calls[0] ?? [];
    expect(getServerSnapshot?.()).toBe("open");

    services.socketClient.start();
    vi.advanceTimersByTime(0);

    gateway.latestConnection().sendWelcome({ marketStatus: "closed" });
    expect(useMarketStatus("open")).toBe("closed");

    services.socketClient.stop();
  });

  it("keeps market status isolated across separate provider instances", () => {
    const gatewayA = createFakeGateway({ marketStatus: "open" });
    const gatewayB = createFakeGateway({ marketStatus: "closed" });
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

    expect(instanceA.socketClient.getMarketStatus()).toBe("open");
    expect(instanceB.socketClient.getMarketStatus()).toBe("closed");

    instanceA.socketClient.stop();
    instanceB.socketClient.stop();
  });
});

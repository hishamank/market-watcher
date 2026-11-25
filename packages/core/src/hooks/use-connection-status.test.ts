import { useContext, useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreServices, createSocketClient, useConnectionStatus } from "../index.ts";
import { createQuoteStore } from "../realtime/quote-store.ts";
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

describe("connection status hydration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports connecting until start, then offline from an offline adapter", () => {
    const client = createSocketClient({
      url: "ws://localhost:4000/ws?v=1",
      quoteStore: createQuoteStore(),
      network: createFakeNetwork("offline"),
      socketFactory: createFakeGateway().socketFactory,
      onWarning: () => {},
    });

    expect(client.getStatus()).toBe("connecting");
    client.start();
    expect(client.getStatus()).toBe("offline");
    client.stop();
  });

  it("gives the hook a stable connecting server snapshot whatever the device state", () => {
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("offline"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
    });
    services.socketClient.start();
    vi.mocked(useContext).mockReturnValue(services);
    vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());

    const result = useConnectionStatus();
    const [, getSnapshot, getServerSnapshot] = vi.mocked(useSyncExternalStore).mock.calls[0] ?? [];

    expect(result.status).toBe("offline");
    expect(getSnapshot?.()).toBe("offline");
    expect(getServerSnapshot?.()).toBe("connecting");
    expect(getServerSnapshot?.()).toBe(getServerSnapshot?.());
    services.socketClient.stop();
  });
});

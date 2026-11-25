import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AnalyticsAdapter, type AnalyticsEvent } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { createNoopAnalytics, track } from "./analytics.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";
import { attachConnectionAnalytics } from "./analytics.ts";

describe("analytics track", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts every analytics event with the default no-op adapter", () => {
    const events: AnalyticsEvent[] = [
      { name: "stock_opened", symbol: "AAPL" },
      { name: "range_changed", symbol: "AAPL", range: "1Y" },
      { name: "watchlist_toggled", symbol: "MSFT", starred: true },
      { name: "search_performed", queryLength: 4, resultCount: 2 },
      { name: "connection_status_changed", from: "connecting", to: "connected" },
    ];
    const noop = createNoopAnalytics();

    for (const event of events) {
      expect(() => track(event)).not.toThrow();
      expect(() => noop.track(event)).not.toThrow();
    }
  });

  it("forwards events to a custom adapter injected through CoreProvider services", () => {
    const received: AnalyticsEvent[] = [];
    const adapter: AnalyticsAdapter = {
      track(event) {
        received.push(event);
      },
    };
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
      analytics: adapter,
    });

    services.track({ name: "stock_opened", symbol: "NVDA" });
    track({ name: "watchlist_toggled", symbol: "NVDA", starred: true }, adapter);

    expect(received).toEqual([
      { name: "stock_opened", symbol: "NVDA" },
      { name: "watchlist_toggled", symbol: "NVDA", starred: true },
    ]);
  });

  it("emits connection_status_changed on socket transitions", () => {
    const gateway = createFakeGateway();
    const received: AnalyticsEvent[] = [];
    const adapter: AnalyticsAdapter = {
      track(event) {
        received.push(event);
      },
    };
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: gateway.socketFactory,
      analytics: adapter,
    });

    const unsubscribe = attachConnectionAnalytics(services.socketClient, services.analytics);
    services.socketClient.start();
    vi.advanceTimersByTime(0);
    gateway.latestConnection().drop();

    expect(received).toEqual([
      { name: "connection_status_changed", from: "connecting", to: "connected" },
      { name: "connection_status_changed", from: "connected", to: "stale" },
    ]);

    unsubscribe();
    services.socketClient.stop();
  });
});

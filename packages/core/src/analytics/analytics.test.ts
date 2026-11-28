import type { AnalyticsContext, AnalyticsEvent } from "@mini/analytics";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCoreServices } from "../core-provider.tsx";
import { RestClientError } from "../rest/rest-client.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";
import {
  attachConnectionAnalytics,
  attachRequestAnalytics,
  attachSessionAnalytics,
} from "./analytics.ts";

function recordingServices(
  gateway = createFakeGateway(),
  initialFeedMode: "simulated" | null = "simulated",
) {
  const received: [AnalyticsEvent, AnalyticsContext][] = [];
  const services = createCoreServices({
    gatewayUrl: "http://localhost:4000",
    initialFeedMode,
    locale: "ar",
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: gateway.socketFactory,
    analytics: { track: (event, context) => void received.push([event, context]) },
  });
  return { services, received, events: () => received.map(([event]) => event) };
}

describe("core analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends each event to the adapter with the locale and feed mode", () => {
    const { services, received } = recordingServices();

    services.track({ name: "stock_opened", symbol: "NVDA" });

    expect(received).toEqual([
      [
        { name: "stock_opened", symbol: "NVDA" },
        { locale: "ar", feedMode: "simulated" },
      ],
    ]);
  });

  it("starts one session on the first connection, once the feed mode is known", () => {
    const gateway = createFakeGateway();
    const { services, received } = recordingServices(gateway, null);

    const stop = attachSessionAnalytics(services, services.socketClient, services.track);
    services.socketClient.start();
    vi.advanceTimersByTime(0);
    gateway.latestConnection().drop();
    vi.advanceTimersByTime(30_000);

    expect(services.socketClient.getStatus()).toBe("connected");
    expect(received).toEqual([
      [{ name: "session_started" }, { locale: "ar", feedMode: "simulated" }],
    ]);
    stop();
    services.socketClient.stop();
  });

  it("reports connection changes with the time spent in the previous status", () => {
    const gateway = createFakeGateway();
    const { services, events } = recordingServices(gateway);

    const unsubscribe = attachConnectionAnalytics(services.socketClient, services.track);
    services.socketClient.start();
    vi.advanceTimersByTime(0);
    vi.advanceTimersByTime(5_000);
    gateway.latestConnection().drop();

    expect(events()).toEqual([
      { name: "connection_status_changed", from: "connecting", to: "connected", msInPrevious: 0 },
      { name: "connection_status_changed", from: "connected", to: "stale", msInPrevious: 5_000 },
    ]);
    unsubscribe();
    services.socketClient.stop();
  });

  it("reports a failed request by resource and code, ignoring other errors", async () => {
    const { services, events } = recordingServices();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unsubscribe = attachRequestAnalytics(client.getQueryCache(), services.track);
    const failing = (error: Error) => () => Promise.reject(error);

    await Promise.allSettled([
      client.fetchQuery({
        queryKey: ["stock-news", "AAPL"],
        queryFn: failing(new RestClientError(503, "unavailable", "down")),
      }),
      client.fetchQuery({
        queryKey: ["stocks", "history", "AAPL", "1D"],
        queryFn: failing(new RestClientError(0, "network_error", "offline")),
      }),
      client.fetchQuery({ queryKey: ["stocks", "list"], queryFn: failing(new Error("other")) }),
    ]);

    expect(events()).toEqual([
      { name: "request_failed", resource: "news", code: "unavailable" },
      { name: "request_failed", resource: "history", code: "network_error" },
    ]);
    unsubscribe();
    services.socketClient.stop();
  });
});

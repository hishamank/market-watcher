import { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AnalyticsAdapter, AnalyticsEvent } from "../index.ts";
import { useTrack } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useContext: vi.fn() };
});

describe("useTrack", () => {
  it("records events through the provider's analytics adapter", () => {
    const received: AnalyticsEvent[] = [];
    const adapter: AnalyticsAdapter = { track: (event) => void received.push(event) };
    const services = createCoreServices({
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
      analytics: adapter,
    });
    vi.mocked(useContext).mockReturnValue(services);

    const track = useTrack();
    track({ name: "stock_opened", symbol: "AAPL" });
    track({ name: "range_changed", symbol: "AAPL", range: "1Y" });

    expect(received).toEqual([
      { name: "stock_opened", symbol: "AAPL" },
      { name: "range_changed", symbol: "AAPL", range: "1Y" },
    ]);
  });
});

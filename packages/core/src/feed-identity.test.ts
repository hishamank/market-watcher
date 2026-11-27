import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCoreServices } from "./core-provider.tsx";
import { createFakeGateway } from "./testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "./testing/fake-platform.ts";
import { stockListBody } from "./testing/fake-rest.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it.each(["live", "simulated"] as const)(
  "rejects the replacement dataset after %s",
  async (first) => {
    const gateway = createFakeGateway({ autoWelcome: false });
    const services = createCoreServices({
      gatewayUrl: "http://test",
      storage: createFakeStorage(),
      network: createFakeNetwork(),
      lifecycle: createFakeLifecycle(),
      socketFactory: gateway.socketFactory,
    });
    services.socketClient.start();
    await vi.advanceTimersByTimeAsync(0);
    gateway.latestConnection().sendWelcome({ feedMode: first });
    gateway.latestConnection().sendQuotes([makeQuote("AAPL", "100.00", 2000)]);
    gateway.latestConnection().drop();
    services.socketClient.retryNow();
    await vi.advanceTimersByTimeAsync(0);
    gateway.latestConnection().sendWelcome({ feedMode: first === "live" ? "simulated" : "live" });
    gateway.latestConnection().sendQuotes([makeQuote("AAPL", "222.00", 3000)]);
    expect(services.quoteStore.getQuote("AAPL")?.price).toBe("100.00");
    services.socketClient.stop();
  },
);

it("rejects a REST response from a different dataset before it can be cached", async () => {
  const gateway = createFakeGateway({ feedMode: "live" });
  const services = createCoreServices({
    gatewayUrl: "http://test",
    storage: createFakeStorage(),
    network: createFakeNetwork(),
    lifecycle: createFakeLifecycle(),
    socketFactory: gateway.socketFactory,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => stockListBody([makeQuote("AAPL", "222.00", 1000)]),
    }),
  });
  services.socketClient.start();
  await vi.advanceTimersByTimeAsync(0);
  await expect(services.restClient.listStocks()).rejects.toThrow();
  services.socketClient.stop();
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCoreServices } from "./core-provider.tsx";
import { createFakeGateway } from "./testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "./testing/fake-platform.ts";
import { dayHistoryBody, stockListBody } from "./testing/fake-rest.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup() {
  const gateway = createFakeGateway({ autoWelcome: false });
  const network = createFakeNetwork();
  const lifecycle = createFakeLifecycle();
  const pending: Array<(data: unknown) => void> = [];
  const services = createCoreServices({
    gatewayUrl: "http://test",
    storage: createFakeStorage(),
    network,
    lifecycle,
    socketFactory: gateway.socketFactory,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: () => new Promise((resolve) => pending.push(resolve)),
    }),
  });
  return { gateway, services, network, lifecycle, pending };
}

it("fences outstanding quotes, history and supplemental responses after quarantine", async () => {
  const { gateway, services, pending, network, lifecycle } = setup();
  services.socketClient.start();
  await vi.advanceTimersByTimeAsync(0);
  gateway.latestConnection().sendWelcome({ feedMode: "simulated" });
  const requests = [
    services.restClient.listStocks(),
    services.restClient.getHistory("AAPL", "1D"),
    services.fetchProfile("AAPL"),
  ];
  const results = Promise.allSettled(requests);
  await vi.advanceTimersByTimeAsync(0);
  gateway.latestConnection().sendWelcome({ feedMode: "live" });
  const bodies = [
    stockListBody([makeQuote("AAPL", "200.00", 1000)]),
    dayHistoryBody("AAPL", []),
    { symbol: "AAPL", source: "simulated", fetchedAt: 1000, profile: null },
  ];
  pending.forEach((resolve, index) => resolve(bodies[index]));
  expect((await results).map((result) => result.status)).toEqual([
    "rejected",
    "rejected",
    "rejected",
  ]);
  expect(services.feedSession.isBlocked()).toBe(true);
  expect(services.quoteStore.getQuote("AAPL")).toBeUndefined();
  const count = gateway.connections.length;
  services.socketClient.retryNow();
  network.setState("offline");
  network.setState("online");
  lifecycle.setState("background");
  await vi.advanceTimersByTimeAsync(11000);
  lifecycle.setState("foreground");
  services.socketClient.stop();
  services.socketClient.start();
  await vi.advanceTimersByTimeAsync(60000);
  expect(gateway.connections).toHaveLength(count);
  await expect(services.restClient.listStocks()).rejects.toThrow("Reload");
  expect(pending).toHaveLength(3);
  services.socketClient.stop();
});

it("same-feed reconnect accepts new prices and REST responses normally", async () => {
  const { gateway, services, pending } = setup();
  services.socketClient.start();
  await vi.advanceTimersByTimeAsync(0);
  gateway.latestConnection().sendWelcome({ feedMode: "simulated" });
  gateway.latestConnection().drop();
  services.socketClient.retryNow();
  await vi.advanceTimersByTimeAsync(0);
  gateway.latestConnection().sendWelcome({ feedMode: "simulated" });
  gateway.latestConnection().sendQuotes([makeQuote("AAPL", "120.00", 2000)]);
  const request = services.restClient.listStocks();
  await vi.advanceTimersByTimeAsync(0);
  pending[0]?.(stockListBody([makeQuote("AAPL", "120.00", 2000)]));
  await expect(request).resolves.toHaveProperty("feedMode", "simulated");
  expect(services.quoteStore.getQuote("AAPL")?.price).toBe("120.00");
  expect(services.feedSession.isBlocked()).toBe(false);
  expect(services.socketClient.getStatus()).toBe("connected");
  services.socketClient.stop();
});

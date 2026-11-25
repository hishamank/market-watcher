import { describe, expect, it } from "vitest";
import { createCoreServices } from "./index.ts";
import { createFakeGateway } from "./testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  settle,
  makeQuote,
} from "./testing/fake-platform.ts";
import { createFakeRest, FAKE_GATEWAY_URL, ok, stockListBody } from "./testing/fake-rest.ts";

function instance() {
  const rest = createFakeRest(() => ok(stockListBody([makeQuote("AAPL", "190.00", 1)])));
  const services = createCoreServices({
    gatewayUrl: FAKE_GATEWAY_URL,
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: createFakeGateway().socketFactory,
    fetch: rest.fetch,
  });
  return { rest, services };
}

describe("core data across provider instances", () => {
  it("gives each instance its own watchlist, quote store and REST client", async () => {
    const a = instance();
    const b = instance();
    a.services.watchlistStore.subscribe(() => {});
    b.services.watchlistStore.subscribe(() => {});
    await settle();

    a.services.watchlistStore.toggle("TSLA");
    a.services.quoteStore.seed([makeQuote("AAPL", "190.00", 1)]);
    await a.services.restClient.listStocks();
    await settle();

    expect(a.services.watchlistStore.getSnapshot().symbols).toEqual(["TSLA"]);
    expect(b.services.watchlistStore.getSnapshot().symbols).toEqual([]);
    expect(b.services.quoteStore.getQuote("AAPL")).toBeUndefined();
    expect(a.rest.requests).toEqual(["/stocks"]);
    expect(b.rest.requests).toEqual([]);
    expect(a.services.watchlistStore).not.toBe(b.services.watchlistStore);
    expect(a.services.restClient).not.toBe(b.services.restClient);
  });
});

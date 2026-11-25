import { QueryClient, type QueryCache } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createCoreServices, stockQueryKeys } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
  settle,
} from "../testing/fake-platform.ts";
import { stockDetailBody, stockListBody } from "../testing/fake-rest.ts";
import { syncQuotesFromQueryCache } from "./quote-cache-sync.ts";

function servicesWith(queryClient: QueryClient) {
  return createCoreServices(
    {
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
    },
    queryClient,
  );
}

function listenerCount(cache: QueryCache): number {
  return cache["listeners"].size;
}

function attach(services: ReturnType<typeof servicesWith>): () => void {
  const cache = services.queryCache;
  if (cache === undefined) throw new Error("services have no query cache");
  return syncQuotesFromQueryCache(cache, services.quoteStore);
}

describe("quote cache sync lifecycle", () => {
  it("listens only while attached, so listeners go back to zero after unmount", () => {
    const queryClient = new QueryClient();
    const cache = queryClient.getQueryCache();
    const discarded = servicesWith(queryClient);
    const committed = servicesWith(queryClient);
    expect(discarded.queryCache).toBe(cache);
    expect(listenerCount(cache)).toBe(0);

    const detach = attach(committed);
    expect(listenerCount(cache)).toBe(1);

    detach();
    expect(listenerCount(cache)).toBe(0);
  });

  it("leaves exactly one listener after StrictMode's mount, unmount and mount", () => {
    const queryClient = new QueryClient();
    const cache = queryClient.getQueryCache();
    servicesWith(queryClient);
    const services = servicesWith(queryClient);

    attach(services)();
    const detach = attach(services);

    expect(listenerCount(cache)).toBe(1);
    detach();
    expect(listenerCount(cache)).toBe(0);
  });

  it("does not accumulate listeners when the provider remounts under a retained client", () => {
    const queryClient = new QueryClient();
    const cache = queryClient.getQueryCache();

    for (let mount = 0; mount < 3; mount += 1) {
      const detach = attach(servicesWith(queryClient));
      expect(listenerCount(cache)).toBe(1);
      detach();
    }

    expect(listenerCount(cache)).toBe(0);
  });

  it("ignores scheduled cache updates once detached", async () => {
    const queryClient = new QueryClient();
    const services = servicesWith(queryClient);
    services.quoteStore.upsert(makeQuote("AAPL", "190.00", 1_000));
    const reader = vi.fn();
    services.quoteStore.subscribe("AAPL", reader);
    const detach = attach(services);

    queryClient.setQueryData(
      stockQueryKeys.detail("AAPL"),
      stockDetailBody(makeQuote("AAPL", "191.00", 2_000)),
    );
    detach();
    await settle();

    expect(services.quoteStore.getQuote("AAPL")?.price).toBe("190.00");
    expect(reader).not.toHaveBeenCalled();
  });

  it("catches up with only the newest cached quote, so a reader never steps back", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
    queryClient.setQueryData(
      stockQueryKeys.detail("AAPL"),
      stockDetailBody(makeQuote("AAPL", "193", 3)),
    );
    const services = servicesWith(queryClient);
    const seen: Array<string | undefined> = [];
    services.quoteStore.subscribe("AAPL", () => {
      seen.push(services.quoteStore.getQuote("AAPL")?.price);
    });

    attach(services);
    await settle();

    expect(seen).toEqual(["193"]);
  });
});

import { QueryClient, useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import { stockQueryKeys, useStock } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
  settle,
} from "../testing/fake-platform.ts";
import { syncQuotesFromQueryCache } from "../rest/quote-cache-sync.ts";
import { stockDetailBody } from "../testing/fake-rest.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useContext: vi.fn() };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

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

function mountedReader(services: ReturnType<typeof servicesWith>, symbol: string) {
  const listener = vi.fn();
  services.quoteStore.subscribe(symbol, listener);
  return listener;
}

describe("stock hooks and the quote store", () => {
  it("does not write the store while a hook renders, so a suspended render cannot hide a quote", () => {
    const services = servicesWith(new QueryClient());
    services.quoteStore.upsert(makeQuote("PROBE", "100.00", 1_000));
    const reader = mountedReader(services, "PROBE");
    reader.mockClear();
    vi.mocked(useContext).mockReturnValue(services);
    vi.mocked(useQuery).mockReturnValue({
      data: stockDetailBody(makeQuote("PROBE", "101.00", 2_000)),
    } as ReturnType<typeof useQuery>);

    useStock("PROBE");

    expect(services.quoteStore.getQuote("PROBE")?.price).toBe("100.00");
    expect(reader).not.toHaveBeenCalled();
  });

  it("applies newer cached data to a mounted reader after the render, with a notification", async () => {
    const queryClient = new QueryClient();
    const services = servicesWith(queryClient);
    services.quoteStore.upsert(makeQuote("PROBE", "100.00", 1_000));
    const reader = mountedReader(services, "PROBE");
    reader.mockClear();
    syncQuotesFromQueryCache(queryClient.getQueryCache(), services.quoteStore);

    queryClient.setQueryData(
      stockQueryKeys.detail("PROBE"),
      stockDetailBody(makeQuote("PROBE", "101.00", 2_000)),
    );

    expect(reader).not.toHaveBeenCalled();
    await settle();
    expect(services.quoteStore.getQuote("PROBE")?.price).toBe("101.00");
    expect(reader).toHaveBeenCalledTimes(1);

    queryClient.setQueryData(
      stockQueryKeys.detail("PROBE"),
      stockDetailBody(makeQuote("PROBE", "101.00", 2_000)),
    );
    await settle();
    expect(reader).toHaveBeenCalledTimes(1);
  });
});

import { dehydrate, hydrate, QueryClient } from "@tanstack/react-query";
import { useContext, useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import { createCoreServices, stockQueryKeys, useQuote } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "../testing/fake-platform.ts";
import { stockDetailBody, stockListBody } from "../testing/fake-rest.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: vi.fn(),
    useCallback: <T>(callback: T) => callback,
    useEffect: vi.fn(),
    useSyncExternalStore: vi.fn(),
  };
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

function useRendered(services: ReturnType<typeof servicesWith>, symbol: string) {
  vi.mocked(useContext).mockReturnValue(services);
  let server: unknown;
  let second: unknown;
  vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot, getServer) => {
    server = getServer?.();
    second = getSnapshot();
    return getSnapshot();
  });
  const client = useQuote(symbol);
  return { client, server, second };
}

describe("useQuote first frame", () => {
  it("reads hydrated quotes before any sync attaches, on server and client alike", () => {
    const layoutServer = new QueryClient();
    layoutServer.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
    const pageServer = new QueryClient();
    pageServer.setQueryData(
      stockQueryKeys.detail("MSFT"),
      stockDetailBody(makeQuote("MSFT", "4", 1)),
    );
    const queryClient = new QueryClient();
    hydrate(queryClient, dehydrate(layoutServer));

    const services = servicesWith(queryClient);
    hydrate(queryClient, dehydrate(pageServer));

    const aapl = useRendered(services, "AAPL");
    const msft = useRendered(services, "MSFT");
    expect(aapl.client?.price).toBe("190");
    expect(msft.client?.price).toBe("4");
    expect(msft.server).toBe(msft.client);
    expect(msft.second).toBe(msft.client);
    expect(services.quoteStore.getQuote("MSFT")).toBeUndefined();
  });

  it("prefers the newest cached quote, and a newer socket quote over the cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
    queryClient.setQueryData(
      stockQueryKeys.detail("AAPL"),
      stockDetailBody(makeQuote("AAPL", "193", 3)),
    );
    const services = servicesWith(queryClient);

    expect(useRendered(services, "AAPL").client?.price).toBe("193");

    services.quoteStore.upsert(makeQuote("AAPL", "200", 5));
    expect(useRendered(services, "AAPL").client?.price).toBe("200");
  });
});

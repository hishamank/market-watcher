import {
  QueriesObserver,
  QueryClient,
  QueryObserver,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useContext } from "react";
import { onTestFinished, expect, it, vi } from "vitest";
import { createCoreServices } from "../core-provider.tsx";
import { useWatchlistStocks as renderWatchlist } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
  settle,
} from "../testing/fake-platform.ts";
import {
  createFakeRest,
  FAKE_GATEWAY_URL,
  notFound,
  ok,
  stockListBody,
} from "../testing/fake-rest.ts";
import { WATCHLIST_STORAGE_KEY } from "../watchlist/watchlist-store.ts";

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useCallback: <T>(callback: T) => callback,
  useContext: vi.fn(),
  useReducer: () => [0, vi.fn()],
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));

vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: vi.fn(),
  useQuery: vi.fn(),
  useQueries: vi.fn(),
}));

async function mount(symbols: string[], rest: ReturnType<typeof createFakeRest>) {
  const client = new QueryClient();
  const storage = createFakeStorage();
  await storage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(symbols));
  const services = createCoreServices(
    {
      gatewayUrl: FAKE_GATEWAY_URL,
      storage,
      fetch: rest.fetch,
      lifecycle: createFakeLifecycle("foreground"),
      network: createFakeNetwork("online"),
      socketFactory: createFakeGateway().socketFactory,
    },
    client,
  );
  const stopWatching = services.watchlistStore.subscribe(() => {});
  await settle();
  vi.mocked(useContext).mockReturnValue(services);
  vi.mocked(useQueryClient).mockReturnValue(client);
  const list = new QueryObserver<unknown, unknown, unknown, unknown, readonly unknown[]>(client, {
    queryKey: ["stocks", "list"],
  });
  const batches = new QueriesObserver(client, []);
  const stopBatches = batches.subscribe(() => {});
  vi.mocked(useQuery).mockImplementation((options) => {
    list.setOptions(options);
    return list.getCurrentResult();
  });
  vi.mocked(useQueries).mockImplementation(({ queries }) => {
    batches.setQueries(queries);
    return batches.getCurrentResult();
  });
  renderWatchlist();
  const stopList = list.subscribe(() => {});
  onTestFinished(() => {
    stopList();
    stopBatches();
    stopWatching();
    client.clear();
  });
  await settle();
  return services;
}

it("loads starred stocks by symbol after the All list fails", async () => {
  const rest = createFakeRest((path) =>
    path === "/stocks" ? notFound(path) : ok(stockListBody([makeQuote("AAPL", "100.00", 1000)])),
  );
  await mount(["AAPL"], rest);
  expect(renderWatchlist()).toMatchObject({ status: "loading" });
  await settle();
  expect(rest.requests).toEqual(["/stocks", "/stocks?symbols=AAPL"]);
  expect(renderWatchlist()).toMatchObject({
    status: "ready",
    stocks: [{ symbol: "AAPL" }],
    rows: [{ symbol: "AAPL", stock: { symbol: "AAPL" }, loading: false }],
  });
});

it("seeds an equal-timestamp last-known quote from the overflow batch", async () => {
  const symbols = Array.from({ length: 101 }, (_, i) => `S${String(i).padStart(3, "0")}`);
  const quote = makeQuote("S100", "100.00", 1000);
  const rest = createFakeRest((path) => {
    if (path === "/stocks") return ok(stockListBody([]));
    const requested = decodeURIComponent(path.slice("/stocks?symbols=".length)).split(",");
    return ok(
      stockListBody(
        requested.map((symbol) =>
          symbol === quote.symbol
            ? { ...quote, lastKnown: true }
            : makeQuote(symbol, "100.00", 1000),
        ),
      ),
    );
  });
  const { quoteStore } = await mount([...symbols].reverse(), rest);
  quoteStore.upsert(quote);
  renderWatchlist();
  await settle();
  expect(rest.requests).toContain("/stocks?symbols=S100");
  expect(quoteStore.getQuote("S100")).toEqual({ ...quote, lastKnown: true });
  const result = renderWatchlist();
  expect(result.status === "ready" && result.stocks.map((stock) => stock.symbol)).toEqual(
    [...symbols].reverse(),
  );
});

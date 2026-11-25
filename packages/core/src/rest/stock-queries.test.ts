import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createQuoteStore } from "../realtime/quote-store.ts";
import { makeQuote } from "../testing/fake-platform.ts";
import {
  createFakeRest,
  dayHistoryBody,
  FAKE_GATEWAY_URL,
  ok,
  stockDetailBody,
  stockListBody,
} from "../testing/fake-rest.ts";
import { createRestClient } from "./rest-client.ts";
import {
  HISTORY_STALE_MS,
  historyQueryOptions,
  historyRefetchMs,
  stockListQueryOptions,
  stockQueryOptions,
  stocksBySymbolsQueryOptions,
} from "./stock-queries.ts";

function setup() {
  const rest = createFakeRest((path) => {
    if (path === "/stocks") {
      return ok(
        stockListBody([makeQuote("AAPL", "190.00", 1_000), makeQuote("MSFT", "400.00", 1_000)]),
      );
    }
    if (path === "/stocks/AAPL") return ok(stockDetailBody(makeQuote("AAPL", "191.00", 3_000)));
    return undefined;
  });
  const client = createRestClient({ gatewayUrl: FAKE_GATEWAY_URL, fetch: rest.fetch });
  return { rest, client, queryClient: new QueryClient() };
}

describe("stock queries", () => {
  it("seeds the quote store from REST without beating a newer live quote", async () => {
    const { client, queryClient } = setup();
    const quoteStore = createQuoteStore();
    quoteStore.upsert(makeQuote("MSFT", "401.00", 2_000));

    await queryClient.fetchQuery(stockListQueryOptions(client, quoteStore));

    expect(quoteStore.getQuote("AAPL")?.price).toBe("190.00");
    expect(quoteStore.getQuote("MSFT")?.price).toBe("401.00");

    await queryClient.fetchQuery(stockQueryOptions(client, "AAPL", quoteStore));
    expect(quoteStore.getQuote("AAPL")?.price).toBe("191.00");
  });

  it("prefetches on a server without a quote store, under the hooks' keys", async () => {
    const { client, queryClient } = setup();

    await queryClient.prefetchQuery(stockListQueryOptions(client));

    expect(queryClient.getQueryData(stockListQueryOptions(client).queryKey)?.stocks).toHaveLength(
      2,
    );
  });

  it("seeds only symbols no reader is watching, and never with an older quote", () => {
    const quoteStore = createQuoteStore();
    let notified = 0;
    quoteStore.subscribe("AAPL", () => {
      notified += 1;
    });
    quoteStore.upsert(makeQuote("AAPL", "190.00", 2_000));
    quoteStore.upsert(makeQuote("MSFT", "400.00", 2_000));

    quoteStore.seed([
      makeQuote("AAPL", "195.00", 3_000),
      makeQuote("MSFT", "399.00", 1_000),
      makeQuote("TSLA", "250.00", 1_000),
    ]);

    expect(notified).toBe(1);
    expect(quoteStore.getQuote("AAPL")?.price).toBe("190.00");
    expect(quoteStore.getQuote("MSFT")?.price).toBe("400.00");
    expect(quoteStore.getQuote("TSLA")?.price).toBe("250.00");
  });

  it("keys a symbols query by the set of symbols, not their order", () => {
    const { client } = setup();

    expect(stocksBySymbolsQueryOptions(client, ["NVDA", "MSFT", "NVDA"]).queryKey).toEqual(
      stocksBySymbolsQueryOptions(client, ["MSFT", "NVDA"]).queryKey,
    );
    expect(stocksBySymbolsQueryOptions(client, []).enabled).toBe(false);
  });

  it("gives each range its own freshness, mirroring the gateway cache", () => {
    const { client } = setup();

    expect(historyQueryOptions(client, "AAPL", "1D").staleTime).toBe(60_000);
    expect(historyQueryOptions(client, "AAPL", "1W").staleTime).toBe(300_000);
    expect(historyQueryOptions(client, "AAPL", "5Y").staleTime).toBe(HISTORY_STALE_MS["5Y"]);
    expect(historyQueryOptions(client, "AAPL", "1Y").queryKey).toEqual([
      "stocks",
      "history",
      "AAPL",
      "1Y",
    ]);
  });

  it("refetches 1D history at its session close, and otherwise every minute", () => {
    const close = Date.UTC(2026, 10, 26);
    const day = { ...dayHistoryBody("AAPL", []), session: { open: close - 86_400_000, close } };

    expect(historyRefetchMs("1D", day, close - 10_000)).toBe(10_000);
    expect(historyRefetchMs("1D", day, close - 300_000)).toBe(60_000);
    expect(historyRefetchMs("1D", day, close + 1)).toBe(60_000);
    expect(historyRefetchMs("1D", undefined, close)).toBe(60_000);
    expect(typeof historyQueryOptions(setup().client, "AAPL", "1D").refetchInterval).toBe(
      "function",
    );
  });
});

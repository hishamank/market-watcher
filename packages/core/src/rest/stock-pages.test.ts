import type { Quote } from "@mini/contracts";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { stockPagesStatus } from "../hooks/use-stock-pages.ts";
import { createQuoteStore } from "../realtime/quote-store.ts";
import { makeQuote } from "../testing/fake-platform.ts";
import { createFakeRest, FAKE_GATEWAY_URL, ok, stockListBody } from "../testing/fake-rest.ts";
import { syncQuotesFromQueryCache } from "./quote-cache-sync.ts";
import { createRestClient } from "./rest-client.ts";
import { stockPagesQueryOptions } from "./stock-queries.ts";

const pageBody = (quotes: readonly Quote[], nextCursor: string | null) => ({
  ...stockListBody(quotes),
  nextCursor,
});

const PAGES: Record<string, ReturnType<typeof pageBody>> = {
  "/stocks?limit=50": pageBody([makeQuote("AAPL", "190.00", 1_000)], "AAPL"),
  "/stocks?limit=50&cursor=AAPL": pageBody([], "BRK.B"),
  "/stocks?limit=50&cursor=BRK.B": pageBody([makeQuote("MSFT", "400.00", 1_000)], null),
};

function setup() {
  const rest = createFakeRest((path) => (PAGES[path] === undefined ? undefined : ok(PAGES[path])));
  const client = createRestClient({ gatewayUrl: FAKE_GATEWAY_URL, fetch: rest.fetch });
  return { rest, client, queryClient: new QueryClient() };
}

describe("stock pages", () => {
  it("follows cursors, steps over an empty page and stops at the end", async () => {
    const { rest, client, queryClient } = setup();
    const quoteStore = createQuoteStore();
    const observer = new InfiniteQueryObserver(
      queryClient,
      stockPagesQueryOptions(client, quoteStore),
    );

    await observer.refetch();
    expect(observer.getCurrentResult().hasNextPage).toBe(true);
    const second = await observer.fetchNextPage();

    const symbols = second.data?.pages.flatMap((page) => page.stocks.map((s) => s.symbol));
    expect(symbols).toEqual(["AAPL", "MSFT"]);
    expect(second.hasNextPage).toBe(false);
    expect(rest.requests).toContain("/stocks?limit=50&cursor=BRK.B");
    expect(quoteStore.getQuote("MSFT")?.price).toBe("400.00");
  });

  it("stops loading by itself after a run of empty pages and offers a retry", async () => {
    const rest = createFakeRest((path) => {
      if (path === "/stocks?limit=50") return ok(pageBody([makeQuote("AAPL", "190.00", 1)], "P0"));
      const index = Number(/cursor=P(\d+)/.exec(path)?.[1]);
      return Number.isNaN(index) ? undefined : ok(pageBody([], `P${index + 1}`));
    });
    const client = createRestClient({ gatewayUrl: FAKE_GATEWAY_URL, fetch: rest.fetch });
    const observer = new InfiniteQueryObserver(new QueryClient(), stockPagesQueryOptions(client));
    await observer.refetch();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (!stockPagesStatus(observer.getCurrentResult()).canLoadMore) break;
      await observer.fetchNextPage();
    }

    const status = stockPagesStatus(observer.getCurrentResult());
    expect(rest.requests).toHaveLength(4);
    expect(status.loadMoreFailed).toBe(true);
    expect(status.stocks?.map((stock) => stock.symbol)).toEqual(["AAPL"]);
  });

  it("seeds the quote store from server-prefetched pages", async () => {
    const { client, queryClient } = setup();
    await queryClient.prefetchInfiniteQuery(stockPagesQueryOptions(client));
    const quoteStore = createQuoteStore();

    syncQuotesFromQueryCache(queryClient.getQueryCache(), quoteStore);

    expect(quoteStore.getQuote("AAPL")?.price).toBe("190.00");
  });
});

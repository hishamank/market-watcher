import { hydrate, dehydrate, QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { makeQuote } from "../testing/fake-platform.ts";
import { stockDetailBody, stockListBody } from "../testing/fake-rest.ts";
import { findCachedQuote } from "./quote-cache-sync.ts";
import { stockQueryKeys } from "./stock-queries.ts";

it("refreshes cached hits and misses as nested hydration adds and replaces data", () => {
  const client = new QueryClient();
  const cache = client.getQueryCache();
  expect(findCachedQuote(cache, "AAPL")).toBeUndefined();
  client.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
  const initial = findCachedQuote(cache, "AAPL");
  expect(initial?.price).toBe("190");
  expect(findCachedQuote(cache, "AAPL")).toBe(initial);
  const server = new QueryClient();
  server.setQueryData(stockQueryKeys.detail("AAPL"), stockDetailBody(makeQuote("AAPL", "192", 3)));
  hydrate(client, dehydrate(server));
  expect(findCachedQuote(cache, "AAPL")?.price).toBe("192");
  client.setQueryData(stockQueryKeys.detail("AAPL"), stockDetailBody(makeQuote("AAPL", "193", 4)));
  expect(findCachedQuote(cache, "AAPL")?.price).toBe("193");
  client.removeQueries({ queryKey: stockQueryKeys.detail("AAPL") });
  expect(findCachedQuote(cache, "AAPL")).toBe(initial);
  client.clear();
  expect(findCachedQuote(cache, "AAPL")).toBeUndefined();
});

it("indexes appended pages and preserves first-source precedence for timestamp ties", () => {
  const client = new QueryClient();
  const cache = client.getQueryCache();
  client.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
  const first = findCachedQuote(cache, "AAPL");
  const page = { ...stockListBody([makeQuote("AAPL", "191", 1)]), nextCursor: "AAPL" };
  client.setQueryData(stockQueryKeys.pages(), { pages: [page], pageParams: [undefined] });
  expect(findCachedQuote(cache, "AAPL")).toBe(first);
  expect(findCachedQuote(cache, "MSFT")).toBeUndefined();
  const next = { ...stockListBody([makeQuote("MSFT", "400", 2)]), nextCursor: null };
  client.setQueryData(stockQueryKeys.pages(), {
    pages: [page, next],
    pageParams: [undefined, "AAPL"],
  });
  expect(findCachedQuote(cache, "MSFT")?.price).toBe("400");
});

it("does not share indexed quotes across clients", () => {
  const a = new QueryClient();
  const b = new QueryClient();
  a.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "190", 1)]));
  b.setQueryData(stockQueryKeys.list(), stockListBody([makeQuote("AAPL", "200", 2)]));
  expect(findCachedQuote(a.getQueryCache(), "AAPL")?.price).toBe("190");
  expect(findCachedQuote(b.getQueryCache(), "AAPL")?.price).toBe("200");
});

it("reads cached pages once across rows and repeated missing-symbol lookups", () => {
  const client = new QueryClient();
  const stocks = stockListBody([makeQuote("AAPL", "190", 1), makeQuote("MSFT", "400", 1)]).stocks;
  let pageReads = 0;
  client.setQueryData(stockQueryKeys.pages(), {
    pages: [
      {
        get stocks() {
          pageReads += 1;
          return stocks;
        },
        nextCursor: null,
      },
    ],
    pageParams: [undefined],
  });
  pageReads = 0;
  const cache = client.getQueryCache();
  expect(findCachedQuote(cache, "AAPL")?.price).toBe("190");
  expect(findCachedQuote(cache, "MSFT")?.price).toBe("400");
  expect(findCachedQuote(cache, "MISSING")).toBeUndefined();
  expect(findCachedQuote(cache, "MISSING")).toBeUndefined();
  expect(pageReads).toBe(1);
});

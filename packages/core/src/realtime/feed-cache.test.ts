import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { createFeedSession } from "./feed-session.ts";
import { watchCachedFeed } from "./feed-cache.ts";
import { createQuoteStore } from "./quote-store.ts";
import { syncQuotesFromQueryCache } from "../rest/quote-cache-sync.ts";
import { stockListBody } from "../testing/fake-rest.ts";
import { makeQuote } from "../testing/fake-platform.ts";

it("quarantines inconsistent hydration before it seeds quotes", () => {
  const client = new QueryClient();
  const session = createFeedSession("live");
  client.setQueryData(["stocks", "list"], stockListBody([makeQuote("AAPL", "200.00", 1)]));
  const stop = watchCachedFeed(client.getQueryCache(), session);
  const quotes = createQuoteStore();
  const stopSync = syncQuotesFromQueryCache(
    client.getQueryCache(),
    quotes,
    () => !session.isBlocked(),
  );
  expect(session.isBlocked()).toBe(true);
  expect(quotes.getQuote("AAPL")).toBeUndefined();
  stopSync();
  stop();
  client.clear();
});

it("rejects incompatible later hydration and preserves the original quote", () => {
  const client = new QueryClient();
  const session = createFeedSession("simulated");
  const stop = watchCachedFeed(client.getQueryCache(), session);
  const quotes = createQuoteStore();
  const stopSync = syncQuotesFromQueryCache(
    client.getQueryCache(),
    quotes,
    () => !session.isBlocked(),
  );
  client.setQueryData(["stocks", "list"], stockListBody([makeQuote("AAPL", "100.00", 2)]));
  client.setQueryData(["stocks", "list"], {
    ...stockListBody([makeQuote("AAPL", "222.00", 3)]),
    feedMode: "live",
  });
  expect(session.isBlocked()).toBe(true);
  expect(quotes.getQuote("AAPL")?.price).toBe("100.00");
  stopSync();
  stop();
  client.clear();
});

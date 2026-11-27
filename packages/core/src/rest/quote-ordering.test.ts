import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createQuoteStore } from "../realtime/quote-store.ts";
import { makeQuote } from "../testing/fake-platform.ts";
import { stockDetailBody } from "../testing/fake-rest.ts";
import { createRestClient } from "./rest-client.ts";
import { stockQueryOptions } from "./stock-queries.ts";

it("a deferred REST response cannot erase newer equal-time reliability metadata", async () => {
  const quoteStore = createQuoteStore();
  const quote = makeQuote("AAPL", "100.00", 1000);
  quoteStore.upsert(quote);
  const response = Promise.withResolvers<unknown>();
  const rest = createRestClient({
    gatewayUrl: "http://gateway.test",
    fetch: async () => ({ ok: true, status: 200, json: () => response.promise }),
  });
  const client = new QueryClient();
  try {
    const pending = client.fetchQuery(stockQueryOptions(rest, "AAPL", quoteStore));
    quoteStore.upsert({ ...quote, lastKnown: true });
    response.resolve(stockDetailBody(quote));
    await pending;
    expect(quoteStore.getQuote("AAPL")?.lastKnown).toBe(true);
    await client.invalidateQueries();
    await client.fetchQuery(stockQueryOptions(rest, "AAPL", quoteStore));
    expect(quoteStore.getQuote("AAPL")?.lastKnown).toBeUndefined();
  } finally {
    client.clear();
  }
});

describe("semantic equality", () => {
  it("preserves identity for identical payloads but accepts equal-time corrections", () => {
    const store = createQuoteStore();
    const quote = {
      ...makeQuote("AAPL", "100.00", 1000),
      dayRange: { low: "90.00", high: "110.00" },
    };
    store.upsert(quote);
    let notifications = 0;
    store.subscribe("AAPL", () => notifications++);
    expect(store.upsert({ ...quote, dayRange: { ...quote.dayRange } })).toBe(false);
    expect(store.getQuote("AAPL")).toBe(quote);
    expect(notifications).toBe(0);
    store.upsert({ ...quote, dayRange: { low: "89.00", high: "110.00" } });
    expect(notifications).toBe(1);
    store.upsert({ ...quote, lastKnown: true });
    expect(store.getQuote("AAPL")?.lastKnown).toBe(true);
    store.upsert(quote);
    expect(store.getQuote("AAPL")?.lastKnown).toBeUndefined();
    expect(notifications).toBe(3);
  });
});

it.each([999, 1001])(
  "orders deferred REST trade timestamp %s independently of metadata",
  async (timestamp) => {
    const store = createQuoteStore();
    const quote = makeQuote("AAPL", "100.00", 1000);
    store.upsert(quote);
    const response = Promise.withResolvers<unknown>();
    const rest = createRestClient({
      gatewayUrl: "http://gateway.test",
      fetch: async () => ({ ok: true, status: 200, json: () => response.promise }),
    });
    const client = new QueryClient();
    try {
      const request = client.fetchQuery(stockQueryOptions(rest, "AAPL", store));
      store.upsert({ ...quote, lastKnown: true });
      response.resolve(stockDetailBody(makeQuote("AAPL", "101.00", timestamp)));
      await request;
      expect(store.getQuote("AAPL")?.timestamp).toBe(Math.max(1000, timestamp));
      expect(store.getQuote("AAPL")?.lastKnown).toBe(timestamp < 1000 ? true : undefined);
    } finally {
      client.clear();
    }
  },
);

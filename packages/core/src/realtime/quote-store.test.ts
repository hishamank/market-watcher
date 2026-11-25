import { describe, expect, it, vi } from "vitest";
import { createQuoteStore } from "../index.ts";
import { makeQuote } from "../testing/fake-platform.ts";

describe("quote store", () => {
  it("returns undefined for unknown symbols and stores incoming quotes", () => {
    const store = createQuoteStore();
    expect(store.getQuote("AAPL")).toBeUndefined();

    const quote = makeQuote("AAPL", "187.42", 1_000);
    expect(store.upsert(quote)).toBe(true);
    expect(store.getQuote("AAPL")).toBe(quote);
  });

  it("ignores an older quote and does not notify listeners", () => {
    const store = createQuoteStore();
    const listener = vi.fn();
    store.subscribe("AAPL", listener);

    const newer = makeQuote("AAPL", "190.00", 2_000);
    const older = makeQuote("AAPL", "185.00", 1_500);

    expect(store.upsert(newer)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    expect(store.upsert(older)).toBe(false);
    expect(store.getQuote("AAPL")).toBe(newer);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("accepts the later arrival when timestamps are equal", () => {
    const store = createQuoteStore();
    const listener = vi.fn();
    store.subscribe("AAPL", listener);

    const first = makeQuote("AAPL", "190.00", 2_000);
    const second = makeQuote("AAPL", "190.25", 2_000);

    expect(store.upsert(first)).toBe(true);
    expect(store.upsert(second)).toBe(true);
    expect(store.getQuote("AAPL")).toBe(second);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("notifies only listeners subscribed to the updated symbol", () => {
    const store = createQuoteStore();
    const aaplListener = vi.fn();
    const msftListener = vi.fn();
    const nvdaListener = vi.fn();

    store.subscribe("AAPL", aaplListener);
    store.subscribe("MSFT", msftListener);
    store.subscribe("NVDA", nvdaListener);

    store.upsert(makeQuote("AAPL", "191.00", 3_000));

    expect(aaplListener).toHaveBeenCalledTimes(1);
    expect(msftListener).not.toHaveBeenCalled();
    expect(nvdaListener).not.toHaveBeenCalled();
  });

  it("preserves snapshot referential stability and honors unsubscribe", () => {
    const store = createQuoteStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe("AAPL", listener);

    const quote = makeQuote("AAPL", "192.00", 4_000);
    store.upsert(quote);
    expect(store.getQuote("AAPL")).toBe(store.getQuote("AAPL"));

    unsubscribe();
    store.upsert(makeQuote("AAPL", "193.00", 5_000));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getQuote("AAPL")?.price).toBe("193.00");
  });
});

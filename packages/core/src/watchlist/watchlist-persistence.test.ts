import { describe, expect, it } from "vitest";
import type { KeyValueListener, KeyValueStore } from "../platform/key-value-store.ts";
import { settle } from "../testing/fake-platform.ts";
import { createWatchlistStore, WATCHLIST_STORAGE_KEY } from "./watchlist-store.ts";

function failingFirstWrite(initial: readonly string[] = []) {
  const values = new Map([[WATCHLIST_STORAGE_KEY, JSON.stringify(initial)]]);
  const listeners = new Set<KeyValueListener>();
  let rejectWrite: (error: Error) => void = () => {};
  const firstWrite = new Promise<void>((_resolve, reject) => {
    rejectWrite = reject;
  });
  let writes = 0;
  const storage: KeyValueStore = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      writes += 1;
      if (writes === 1) await firstWrite;
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    storage,
    fail: () => rejectWrite(new Error("Storage quota exceeded")),
    externalWrite(symbols: readonly string[]) {
      values.set(WATCHLIST_STORAGE_KEY, JSON.stringify(symbols));
      for (const listener of listeners) listener(WATCHLIST_STORAGE_KEY);
    },
  };
}

describe("watchlist persistence failures", () => {
  it("rolls back a failed star to the last persisted watchlist", async () => {
    const browser = failingFirstWrite(["MSFT"]);
    const store = createWatchlistStore(browser.storage);
    store.subscribe(() => {});
    await settle();

    store.toggle("AAPL");
    expect(store.getSnapshot().symbols).toEqual(["AAPL", "MSFT"]);
    await settle();
    browser.fail();
    await settle();

    expect(store.getSnapshot().saveFailed).toBe(true);
    expect(store.getSnapshot().symbols).toEqual(["MSFT"]);
    store.dismissError();
    expect(store.getSnapshot().saveFailed).toBeUndefined();
    expect(await browser.storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["MSFT"]');
  });

  it("persists a queued later intent without including the failed star", async () => {
    const browser = failingFirstWrite(["MSFT"]);
    const store = createWatchlistStore(browser.storage);
    store.subscribe(() => {});
    await settle();

    store.toggle("AAPL");
    await settle();
    store.toggle("NVDA");
    expect(store.getSnapshot().symbols).toEqual(["NVDA", "AAPL", "MSFT"]);
    browser.fail();
    await settle();

    expect(store.getSnapshot().saveFailed).toBe(true);
    expect(store.getSnapshot().symbols).toEqual(["NVDA", "MSFT"]);
    expect(await browser.storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["NVDA","MSFT"]');
    const reloaded = createWatchlistStore(browser.storage);
    reloaded.subscribe(() => {});
    await settle();
    expect(reloaded.getSnapshot().symbols).toEqual(["NVDA", "MSFT"]);
  });

  it("allows a new successful star after failure and follows other-tab changes", async () => {
    const browser = failingFirstWrite();
    const store = createWatchlistStore(browser.storage);
    store.subscribe(() => {});
    await settle();

    store.toggle("AAPL");
    await settle();
    browser.fail();
    await settle();
    store.toggle("AAPL");
    await settle();

    expect(store.getSnapshot().saveFailed).toBeUndefined();
    expect(store.getSnapshot().symbols).toEqual(["AAPL"]);
    expect(await browser.storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["AAPL"]');
    browser.externalWrite(["TSLA", "AAPL"]);
    await settle();
    expect(store.getSnapshot().symbols).toEqual(["TSLA", "AAPL"]);
    store.toggle("AAPL");
    await settle();
    expect(await browser.storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["TSLA"]');
  });

  it("preserves the final intent of rapid same-symbol toggles after an earlier failure", async () => {
    const browser = failingFirstWrite(["MSFT"]);
    const store = createWatchlistStore(browser.storage);
    store.subscribe(() => {});
    await settle();

    store.toggle("AAPL");
    await settle();
    store.toggle("AAPL");
    store.toggle("AAPL");
    store.toggle("NVDA");
    browser.fail();
    await settle();

    expect(store.getSnapshot().symbols).toEqual(["NVDA", "AAPL", "MSFT"]);
    expect(await browser.storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["NVDA","AAPL","MSFT"]');
  });
});

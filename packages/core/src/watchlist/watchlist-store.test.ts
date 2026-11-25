import { describe, expect, it } from "vitest";
import type { KeyValueListener, KeyValueStore } from "../platform/key-value-store.ts";
import { createFakeStorage, settle } from "../testing/fake-platform.ts";
import { createWatchlistStore, WATCHLIST_STORAGE_KEY } from "./watchlist-store.ts";

function createBrowserLikeStorage() {
  const map = new Map<string, string>();
  const listeners = new Set<KeyValueListener>();
  const storage: KeyValueStore = {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    storage,
    map,
    writeFromOtherTab(key: string, value: string) {
      map.set(key, value);
      for (const listener of Array.from(listeners)) listener(key);
    },
    listenerCount: () => listeners.size,
  };
}

describe("watchlist store", () => {
  it("puts the most recently starred symbol first and removes unstarred ones", async () => {
    const storage = createFakeStorage();
    const store = createWatchlistStore(storage);
    store.subscribe(() => {});
    await settle();

    store.toggle("MSFT");
    store.toggle("NVDA");
    store.toggle("AAPL");
    expect(store.getSnapshot().symbols).toEqual(["AAPL", "NVDA", "MSFT"]);

    store.toggle("NVDA");
    expect(store.getSnapshot().symbols).toEqual(["AAPL", "MSFT"]);
    await settle();
    expect(await storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["AAPL","MSFT"]');
  });

  it("restores the stored order on a fresh instance", async () => {
    const storage = createFakeStorage();
    await storage.setItem(WATCHLIST_STORAGE_KEY, '["NVDA","MSFT"]');
    const store = createWatchlistStore(storage);
    expect(store.getSnapshot()).toEqual({ symbols: [], loaded: false });

    store.subscribe(() => {});
    await settle();

    expect(store.getSnapshot()).toEqual({ symbols: ["NVDA", "MSFT"], loaded: true });
  });

  it.each(["not json", '{"symbols":["AAPL"]}', '["AAPL", 42]', '[""]', "null"])(
    "starts empty from the corrupt value %s and can star afterwards",
    async (corrupt) => {
      const storage = createFakeStorage();
      await storage.setItem(WATCHLIST_STORAGE_KEY, corrupt);
      const store = createWatchlistStore(storage);
      store.subscribe(() => {});
      await settle();

      expect(store.getSnapshot()).toEqual({ symbols: [], loaded: true });

      store.toggle("TSLA");
      await settle();
      expect(await storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["TSLA"]');
    },
  );

  it("does not let the first read clobber a toggle made before it resolved", async () => {
    const storage = createFakeStorage();
    await storage.setItem(WATCHLIST_STORAGE_KEY, '["MSFT"]');
    const store = createWatchlistStore(storage);

    store.toggle("NVDA");
    expect(store.getSnapshot().symbols).toEqual(["NVDA"]);
    await settle();

    expect(store.getSnapshot()).toEqual({ symbols: ["NVDA", "MSFT"], loaded: true });
    expect(await storage.getItem(WATCHLIST_STORAGE_KEY)).toBe('["NVDA","MSFT"]');
  });

  it("follows writes from another tab and stops listening when unused", async () => {
    const browser = createBrowserLikeStorage();
    const store = createWatchlistStore(browser.storage);
    let notified = 0;
    const unsubscribe = store.subscribe(() => {
      notified += 1;
    });
    await settle();
    const afterLoad = notified;

    browser.writeFromOtherTab(WATCHLIST_STORAGE_KEY, '["TSLA"]');
    await settle();
    expect(store.getSnapshot().symbols).toEqual(["TSLA"]);
    expect(notified).toBe(afterLoad + 1);

    browser.writeFromOtherTab("unrelated", "x");
    await settle();
    expect(notified).toBe(afterLoad + 1);

    unsubscribe();
    expect(browser.listenerCount()).toBe(0);
  });

  it("keeps the same snapshot when its own write echoes back", async () => {
    const store = createWatchlistStore(createFakeStorage());
    store.subscribe(() => {});
    await settle();
    store.toggle("AAPL");
    const afterToggle = store.getSnapshot();
    await settle();

    expect(store.getSnapshot()).toBe(afterToggle);
  });

  it("re-reads storage when a subscriber returns, so another tab's star survives a toggle", async () => {
    const browser = createBrowserLikeStorage();
    const store = createWatchlistStore(browser.storage);
    const unsubscribe = store.subscribe(() => {});
    await settle();
    unsubscribe();

    browser.writeFromOtherTab(WATCHLIST_STORAGE_KEY, '["TSLA"]');
    store.subscribe(() => {});
    await settle();
    expect(store.getSnapshot()).toEqual({ symbols: ["TSLA"], loaded: true });

    store.toggle("AAPL");
    await settle();
    expect(JSON.parse(browser.map.get(WATCHLIST_STORAGE_KEY) ?? "[]")).toEqual(["AAPL", "TSLA"]);
  });
});

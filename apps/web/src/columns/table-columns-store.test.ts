import { describe, expect, it } from "vitest";
import type { KeyValueListener, KeyValueStore } from "@mini/core";
import {
  createTableColumnsStore,
  parseTableColumns,
  TABLE_COLUMNS_STORAGE_KEY,
  toggleColumn,
} from "./table-columns-store.ts";

function createFakeStorage(): KeyValueStore {
  const values = new Map<string, string>();
  const listeners = new Set<KeyValueListener>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
      for (const listener of listeners) listener(key);
    },
    removeItem: async (key) => {
      values.delete(key);
      for (const listener of listeners) listener(key);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("table columns", () => {
  it("falls back to the default layout for missing or corrupt storage", () => {
    expect(parseTableColumns(null)).toBeUndefined();
    expect(parseTableColumns("not json")).toBeUndefined();
    expect(parseTableColumns('{"symbol":true}')).toBeUndefined();
  });

  it("drops unknown columns, restores locked ones and keeps the table order", () => {
    expect(parseTableColumns('["dayLow","volume","symbol"]')).toEqual([
      "name",
      "symbol",
      "price",
      "dayLow",
    ]);
  });

  it("never hides a locked column", () => {
    const shown = toggleColumn(["name", "price", "symbol"], "price");
    expect(shown).toEqual(["name", "symbol", "price"]);
    expect(toggleColumn(shown, "symbol")).toEqual(["name", "price"]);
    expect(toggleColumn(["name", "price"], "dayHigh")).toEqual(["name", "price", "dayHigh"]);
  });

  it("saves a choice, reloads it in another store and resets to the default", async () => {
    const storage = createFakeStorage();
    const first = createTableColumnsStore(storage);
    first.subscribe(() => {});
    await settle();
    expect(first.getSnapshot()).toEqual({ columns: undefined, loaded: true });

    first.choose(["name", "price", "dayHigh"]);
    await settle();
    expect(await storage.getItem(TABLE_COLUMNS_STORAGE_KEY)).toBe('["name","price","dayHigh"]');

    const second = createTableColumnsStore(storage);
    second.subscribe(() => {});
    await settle();
    expect(second.getSnapshot().columns).toEqual(["name", "price", "dayHigh"]);

    second.reset();
    await settle();
    expect(await storage.getItem(TABLE_COLUMNS_STORAGE_KEY)).toBeNull();
    expect(first.getSnapshot().columns).toBeUndefined();
  });
});

import { SymbolSchema } from "@mini/contracts";
import type { KeyValueStore } from "../platform/key-value-store.ts";

export const WATCHLIST_STORAGE_KEY = "watchlist:v1";

export interface WatchlistSnapshot {
  readonly symbols: readonly string[];
  readonly loaded: boolean;
  readonly saveFailed?: boolean;
}

export type WatchlistListener = () => void;

export interface WatchlistStore {
  getSnapshot(): WatchlistSnapshot;
  subscribe(listener: WatchlistListener): () => void;
  toggle(symbol: string): void;
  dismissError(): void;
}

interface ToggleIntent {
  readonly symbol: string;
  readonly starred: boolean;
}

export const EMPTY_WATCHLIST: WatchlistSnapshot = { symbols: [], loaded: false };

export function parseWatchlist(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const symbols: string[] = [];
    for (const item of value) {
      const parsed = SymbolSchema.safeParse(item);
      if (!parsed.success) return [];
      symbols.push(parsed.data);
    }
    return [...new Set(symbols)];
  } catch {
    return [];
  }
}

function applyIntent(symbols: readonly string[], intent: ToggleIntent): readonly string[] {
  const without = symbols.filter((symbol) => symbol !== intent.symbol);
  return intent.starred ? [intent.symbol, ...without] : without;
}

function sameSymbols(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((symbol, index) => symbol === b[index]);
}

export function createWatchlistStore(storage: KeyValueStore): WatchlistStore {
  const listeners = new Set<WatchlistListener>();
  const pending: ToggleIntent[] = [];
  let committed: readonly string[] = [];
  let loaded = false;
  let saveFailed = false;
  let loadStarted = false;
  let snapshot = EMPTY_WATCHLIST;
  let queue: Promise<void> = Promise.resolve();
  let stopStorage: (() => void) | null = null;

  function publish(): void {
    const symbols = pending.reduce(applyIntent, committed);
    if (
      loaded === snapshot.loaded &&
      saveFailed === Boolean(snapshot.saveFailed) &&
      sameSymbols(symbols, snapshot.symbols)
    )
      return;
    snapshot = { symbols, loaded, ...(saveFailed ? { saveFailed } : {}) };
    for (const listener of Array.from(listeners)) listener();
  }

  function enqueue(task: () => Promise<void>): void {
    queue = queue.then(task).catch(() => {});
  }

  function read(): void {
    enqueue(async () => {
      const raw = await storage.getItem(WATCHLIST_STORAGE_KEY).catch(() => null);
      committed = parseWatchlist(raw);
      loaded = true;
      publish();
    });
  }

  function ensureLoaded(): void {
    if (loadStarted) return;
    loadStarted = true;
    read();
  }

  function write(intent: ToggleIntent): void {
    enqueue(async () => {
      const next = applyIntent(committed, intent);
      try {
        await storage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
        committed = next;
      } catch {
        saveFailed = true;
      }
      pending.shift();
      publish();
    });
  }

  return {
    getSnapshot: () => snapshot,
    dismissError() {
      saveFailed = false;
      publish();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (stopStorage === null) {
        stopStorage = storage.subscribe((key) => {
          if (key === WATCHLIST_STORAGE_KEY) read();
        });
        loadStarted = true;
        read();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && stopStorage !== null) {
          stopStorage();
          stopStorage = null;
        }
      };
    },
    toggle(symbol) {
      saveFailed = false;
      ensureLoaded();
      const intent = { symbol, starred: !snapshot.symbols.includes(symbol) };
      pending.push(intent);
      publish();
      write(intent);
    },
  };
}

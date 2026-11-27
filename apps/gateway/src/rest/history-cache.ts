import type { MarketStatus, Range } from "@mini/contracts";
import type { HistorySeries, HistorySource, MarketCalendar } from "../feeds/types.ts";
import type { Warn } from "../hub/quote-book.ts";
import {
  type CacheEntry,
  cacheKey,
  classifyEntry,
  freshnessFor,
  putEntry,
  touchEntry,
} from "./history-freshness.ts";
import { HISTORY_CACHE_MAX_ENTRIES, HISTORY_SOURCE_TIMEOUT_MS } from "./limits.ts";
import { attemptSource } from "./source-attempt.ts";

export interface HistoryCacheOptions {
  sources: readonly HistorySource[];
  calendar: MarketCalendar;
  now: () => number;
  warn: Warn;
  maxEntries?: number;
  sourceTimeoutMs?: number;
}

export interface HistoryCacheResult {
  series: HistorySeries;
  ageMs?: number;
}

export interface HistoryCacheStats {
  hits: number;
  misses: number;
}

export interface HistoryCache {
  get(symbol: string, range: Range): Promise<HistoryCacheResult>;
  stats(): HistoryCacheStats;
  close(): void;
}

interface CacheState {
  readonly entries: Map<string, CacheEntry>;
  readonly inFlight: Map<string, Promise<HistorySeries>>;
  readonly maxEntries: number;
  readonly sourceTimeoutMs: number;
  readonly controllers: Set<AbortController>;
  lastKnownStatus: MarketStatus;
  openEpoch: number;
}

async function fetchFromChain(
  state: CacheState,
  sources: readonly HistorySource[],
  symbol: string,
  range: Range,
  now: number,
  warn: Warn,
): Promise<HistorySeries> {
  let lastError: unknown;
  for (const source of sources) {
    try {
      const request = { symbol, range, now };
      return await attemptSource(source, request, state.sourceTimeoutMs, state.controllers);
    } catch (err) {
      lastError = err;
      warn({ err, symbol, range }, "history source failed");
    }
  }
  throw lastError ?? new Error("No history sources configured");
}

function syncStatus(state: CacheState, next: MarketStatus): void {
  if (next === state.lastKnownStatus) return;
  if (next === "open") {
    state.openEpoch += 1;
  }
  state.lastKnownStatus = next;
}

function refreshEntry(
  state: CacheState,
  options: HistoryCacheOptions,
  key: string,
  symbol: string,
  range: Range,
  requestNow: number,
): Promise<HistorySeries> {
  const existing = state.inFlight.get(key);
  if (existing) return existing;

  const statusAtStart = options.calendar.status(requestNow);
  const sessionAtStart = options.calendar.session(requestNow);
  const epochAtStart = state.openEpoch;

  const promise = fetchFromChain(state, options.sources, symbol, range, requestNow, options.warn)
    .then((series) => {
      const completedAt = options.now();
      if (
        options.calendar.status(completedAt) !== statusAtStart ||
        options.calendar.session(completedAt).open !== sessionAtStart.open ||
        state.openEpoch !== epochAtStart
      ) {
        throw new Error("History response crossed a market phase; retry for current history");
      }
      const freshness = freshnessFor(range, requestNow, statusAtStart, sessionAtStart);
      putEntry(
        state.entries,
        key,
        {
          series,
          fetchedAt: requestNow,
          openEpoch: epochAtStart,
          sessionOpen: sessionAtStart.open,
          ...freshness,
        },
        state.maxEntries,
      );
      return series;
    })
    .finally(() => {
      if (state.inFlight.get(key) === promise) {
        state.inFlight.delete(key);
      }
    });

  state.inFlight.set(key, promise);
  return promise;
}

export function createHistoryCache(options: HistoryCacheOptions): HistoryCache {
  const state: CacheState = {
    entries: new Map(),
    inFlight: new Map(),
    maxEntries: options.maxEntries ?? HISTORY_CACHE_MAX_ENTRIES,
    sourceTimeoutMs: options.sourceTimeoutMs ?? HISTORY_SOURCE_TIMEOUT_MS,
    controllers: new Set(),
    lastKnownStatus: options.calendar.status(options.now()),
    openEpoch: 0,
  };

  const counts: HistoryCacheStats = { hits: 0, misses: 0 };
  const stopStatus = options.calendar.onStatusChange((status) => {
    syncStatus(state, status);
  });

  async function get(symbol: string, range: Range): Promise<HistoryCacheResult> {
    const currentNow = options.now();
    const status = options.calendar.status(currentNow);
    syncStatus(state, status);
    const key = cacheKey(symbol, range);
    const entry = state.entries.get(key);

    if (entry !== undefined) {
      const entryState = classifyEntry(
        entry,
        currentNow,
        status,
        state.openEpoch,
        options.calendar.session(currentNow).open,
      );
      if (entryState !== "expired") counts.hits += 1;
      if (entryState === "fresh") {
        touchEntry(state.entries, key, entry);
        return { series: entry.series };
      }
      if (entryState === "swr") {
        touchEntry(state.entries, key, entry);
        void refreshEntry(state, options, key, symbol, range, currentNow).catch(() => undefined);
        return { series: entry.series };
      }
    }

    counts.misses += 1;
    try {
      const series = await refreshEntry(state, options, key, symbol, range, currentNow);
      return { series };
    } catch (err) {
      if (entry !== undefined) {
        touchEntry(state.entries, key, entry);
        return {
          series: entry.series,
          ageMs: Math.max(0, Math.floor(options.now() - entry.fetchedAt)),
        };
      }
      throw err;
    }
  }

  return {
    get,
    stats: () => ({ ...counts }),
    close: () => {
      stopStatus();
      state.controllers.forEach((controller) =>
        controller.abort(new Error("History cache closed")),
      );
      state.entries.clear();
      state.inFlight.clear();
    },
  };
}

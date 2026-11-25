import type { MarketStatus, Range, Session } from "@mini/contracts";
import type { HistorySeries } from "../feeds/types.ts";
import { FRESHNESS_1D_MS, FRESHNESS_1W_MS } from "./limits.ts";

export interface CacheEntry {
  readonly series: HistorySeries;
  readonly fetchedAt: number;
  readonly fetchedWhileClosed: boolean;
  readonly openEpoch: number;
  readonly sessionOpen: number;
  readonly expiresAt: number;
  readonly swrWindowMs: number;
}

export type EntryState = "fresh" | "swr" | "expired";

export function cacheKey(symbol: string, range: Range): string {
  return `${symbol}:${range}`;
}

export function freshnessFor(
  range: Range,
  fetchedAt: number,
  status: MarketStatus,
  session: Session,
): { fetchedWhileClosed: boolean; expiresAt: number; swrWindowMs: number } {
  if (status === "closed") {
    return { fetchedWhileClosed: true, expiresAt: fetchedAt, swrWindowMs: 0 };
  }
  if (range === "1D") {
    return {
      fetchedWhileClosed: false,
      expiresAt: fetchedAt + FRESHNESS_1D_MS,
      swrWindowMs: FRESHNESS_1D_MS,
    };
  }
  if (range === "1W") {
    return {
      fetchedWhileClosed: false,
      expiresAt: fetchedAt + FRESHNESS_1W_MS,
      swrWindowMs: FRESHNESS_1W_MS,
    };
  }
  const expiresAt = Math.max(fetchedAt, session.close);
  return {
    fetchedWhileClosed: false,
    expiresAt,
    swrWindowMs: Math.max(0, expiresAt - fetchedAt),
  };
}

export function classifyEntry(
  entry: CacheEntry,
  now: number,
  status: MarketStatus,
  openEpoch: number,
  lastClosedAt: number | undefined,
  sessionOpen: number,
): EntryState {
  if (status === "closed") {
    if (entry.openEpoch !== openEpoch) return "expired";
    if (entry.fetchedWhileClosed) return "fresh";
    if (lastClosedAt !== undefined && entry.expiresAt > lastClosedAt) return "fresh";
    if (now < entry.expiresAt) return "fresh";
    return "expired";
  }
  if (
    entry.fetchedWhileClosed ||
    entry.openEpoch !== openEpoch ||
    entry.sessionOpen !== sessionOpen
  ) {
    return "expired";
  }
  if (now < entry.expiresAt) {
    return "fresh";
  }
  if (now < entry.expiresAt + entry.swrWindowMs) {
    return "swr";
  }
  return "expired";
}

export function touchEntry(map: Map<string, CacheEntry>, key: string, entry: CacheEntry): void {
  map.delete(key);
  map.set(key, entry);
}

export function putEntry(
  map: Map<string, CacheEntry>,
  key: string,
  entry: CacheEntry,
  maxEntries: number,
): void {
  map.delete(key);
  map.set(key, entry);
  while (map.size > maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

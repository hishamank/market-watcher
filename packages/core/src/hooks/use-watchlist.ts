"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import { EMPTY_WATCHLIST, type WatchlistSnapshot } from "../watchlist/watchlist-store.ts";

export interface WatchlistResult {
  readonly symbols: readonly string[];
  readonly isLoaded: boolean;
  readonly isStarred: (symbol: string) => boolean;
  readonly toggle: (symbol: string) => void;
}

function getServerSnapshot(): WatchlistSnapshot {
  return EMPTY_WATCHLIST;
}

export function useWatchlist(): WatchlistResult {
  const { watchlistStore, track } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => watchlistStore.subscribe(listener),
    [watchlistStore],
  );

  const getSnapshot = useCallback(() => watchlistStore.getSnapshot(), [watchlistStore]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    symbols: snapshot.symbols,
    isLoaded: snapshot.loaded,
    isStarred: (symbol) => snapshot.symbols.includes(symbol),
    toggle: (symbol) => {
      const starred = !watchlistStore.getSnapshot().symbols.includes(symbol);
      watchlistStore.toggle(symbol);
      track({ name: "watchlist_toggled", symbol, starred });
    },
  };
}

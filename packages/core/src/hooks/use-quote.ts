"use client";

import type { Quote } from "@mini/contracts";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import { findCachedQuote } from "../rest/quote-cache-sync.ts";

export function useQuote(symbol: string): Quote | undefined {
  const { quoteStore, queryCache, socketClient } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => quoteStore.subscribe(symbol, listener),
    [quoteStore, symbol],
  );

  const getSnapshot = useCallback(() => {
    const stored = quoteStore.getQuote(symbol);
    if (stored !== undefined || queryCache === undefined) return stored;
    return findCachedQuote(queryCache, symbol);
  }, [quoteStore, queryCache, symbol]);

  useEffect(() => {
    if (symbol.length === 0) {
      return undefined;
    }
    return socketClient.acquireSymbol(symbol);
  }, [socketClient, symbol]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import type { QuoteAvailability } from "../realtime/quote-store.ts";

export function useQuoteAvailability(symbol: string): QuoteAvailability {
  const { quoteStore } = useCore();
  const subscribe = useCallback(
    (listener: () => void) => quoteStore.subscribeAvailability(symbol, listener),
    [quoteStore, symbol],
  );
  const snapshot = useCallback(() => quoteStore.getAvailability(symbol), [quoteStore, symbol]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

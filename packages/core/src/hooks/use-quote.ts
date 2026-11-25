import type { Quote } from "@mini/contracts";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";

export function useQuote(symbol: string): Quote | undefined {
  const { quoteStore, socketClient } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => quoteStore.subscribe(symbol, listener),
    [quoteStore, symbol],
  );

  const getSnapshot = useCallback(() => quoteStore.getQuote(symbol), [quoteStore, symbol]);

  useEffect(() => {
    if (symbol.length === 0) {
      return undefined;
    }
    return socketClient.acquireSymbol(symbol);
  }, [socketClient, symbol]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

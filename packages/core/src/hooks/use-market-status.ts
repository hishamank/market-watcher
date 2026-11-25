"use client";

import type { MarketStatus } from "@mini/contracts";
import { useCallback, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";

export function useMarketStatus(initialStatus: MarketStatus | null = null): MarketStatus | null {
  const { socketClient } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => socketClient.subscribeMarketStatus(listener),
    [socketClient],
  );

  const getSnapshot = useCallback(
    () => socketClient.getMarketStatus() ?? initialStatus,
    [socketClient, initialStatus],
  );

  const getServerSnapshot = useCallback(() => initialStatus, [initialStatus]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

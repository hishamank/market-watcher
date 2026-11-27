"use client";

import type { FeedMode } from "@mini/contracts";
import { useCallback, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";

function getServerSnapshot(): FeedMode | null {
  return null;
}

export function useFeedMode(): FeedMode | null {
  const { socketClient } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => socketClient.subscribeFeedMode(listener),
    [socketClient],
  );

  const getSnapshot = useCallback(() => socketClient.getFeedMode(), [socketClient]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";

const NO_PENDING_DATA: readonly unknown[] = [];

export function useFeedSession(pendingData: readonly unknown[] = NO_PENDING_DATA): {
  reloadRequired: boolean;
} {
  const { feedSession, queryCache } = useCore();
  const snapshot = () =>
    !feedSession.isCompatible([
      ...(queryCache?.getAll().map((query) => query.state.data) ?? []),
      ...pendingData,
    ]);
  const subscribe = (listener: () => void) => {
    const stopSession = feedSession.subscribe(listener);
    const stopCache = queryCache?.subscribe(listener);
    return () => {
      stopSession();
      stopCache?.();
    };
  };
  const reloadRequired = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    try {
      for (const data of pendingData) feedSession.check(data);
    } catch {
      return;
    }
  }, [feedSession, pendingData]);
  return { reloadRequired };
}

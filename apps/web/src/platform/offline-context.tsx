"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { ControllableNetworkStatus } from "./online-status.ts";

export const OfflineControlContext = createContext<ControllableNetworkStatus | null>(null);

function getServerSnapshot(): boolean {
  return false;
}

export interface OfflineControlResult {
  readonly offline: boolean;
  readonly setOffline: (offline: boolean) => void;
}

export function useOfflineControl(): OfflineControlResult {
  const network = useContext(OfflineControlContext);
  if (network === null) {
    throw new Error("useOfflineControl must be called inside Providers");
  }
  const offline = useSyncExternalStore(
    (listener) => network.subscribeForcedOffline(listener),
    () => network.isForcedOffline(),
    getServerSnapshot,
  );
  return {
    offline,
    setOffline: (next) => network.setForcedOffline(next),
  };
}

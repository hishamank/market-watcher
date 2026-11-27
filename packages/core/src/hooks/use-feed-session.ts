"use client";

import { useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";

export function useFeedSession(): { reloadRequired: boolean } {
  const { feedSession } = useCore();
  const reloadRequired = useSyncExternalStore(
    feedSession.subscribe,
    feedSession.isBlocked,
    () => false,
  );
  return { reloadRequired };
}

"use client";

import { useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import type { ColorScheme } from "../platform/color-scheme.ts";

const serverSnapshot = (): ColorScheme => "light";
const subscribe = () => () => {};

export function useColorScheme() {
  const { colorScheme: store, track } = useCore();
  const scheme = useSyncExternalStore(
    store?.subscribe ?? subscribe,
    store?.getSnapshot ?? serverSnapshot,
    serverSnapshot,
  );
  const toggle = () => {
    if (store === undefined) return;
    const next = scheme === "light" ? "dark" : "light";
    store.set(next);
    track({ name: "theme_changed", to: next });
  };
  return { scheme, toggle };
}

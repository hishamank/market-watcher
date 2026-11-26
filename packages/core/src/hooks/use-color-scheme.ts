"use client";

import { useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import type { ColorScheme } from "../platform/color-scheme.ts";

const serverSnapshot = (): ColorScheme => "light";
const subscribe = () => () => {};

export function useColorScheme() {
  const store = useCore().colorScheme;
  const scheme = useSyncExternalStore(
    store?.subscribe ?? subscribe,
    store?.getSnapshot ?? serverSnapshot,
    serverSnapshot,
  );
  return { scheme, toggle: () => store?.set(scheme === "light" ? "dark" : "light") };
}

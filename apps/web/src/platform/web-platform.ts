import {
  type AnalyticsAdapter,
  createConsoleAnalytics,
  createNoopAnalytics,
} from "@mini/analytics";
import type { AppLifecycle, ColorSchemeStore, KeyValueStore } from "@mini/core";
import { createLocalStorageStore } from "./local-storage-store.ts";
import { type ControllableNetworkStatus, createOnlineStatus } from "./online-status.ts";
import { createPageVisibility } from "./page-visibility.ts";

import { createColorSchemeStore } from "./color-scheme.ts";

export interface WebPlatform {
  readonly analytics: AnalyticsAdapter;
  readonly colorScheme: ColorSchemeStore;
  readonly storage: KeyValueStore;
  readonly network: ControllableNetworkStatus;
  readonly lifecycle: AppLifecycle;
}

export function createWebPlatform(): WebPlatform {
  return {
    analytics:
      process.env.NODE_ENV === "production"
        ? createNoopAnalytics()
        : createConsoleAnalytics({
            platform: "web",
            log: (label, payload) => console.info(label, payload),
          }),
    colorScheme: createColorSchemeStore(),
    storage: createLocalStorageStore(),
    network: createOnlineStatus(),
    lifecycle: createPageVisibility(),
  };
}

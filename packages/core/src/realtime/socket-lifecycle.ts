import type { AppLifecycle, LifecycleState } from "../platform/app-lifecycle.ts";
import type { NetworkState, NetworkStatus } from "../platform/network-status.ts";
import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";

export interface PlatformBridgeOptions {
  network: NetworkStatus;
  lifecycle?: AppLifecycle | undefined;
  backgroundGraceMs: number;
  onOffline(): void;
  onOnline(isPausedInBackground: boolean): void;
  onBackgroundPause(): void;
  onForegroundResume(): void;
}

export interface PlatformBridge {
  start(): void;
  stop(): void;
  isOffline(): boolean;
  isPausedInBackground(): boolean;
}

export function createPlatformBridge(options: PlatformBridgeOptions): PlatformBridge {
  let unsubscribeNetwork: (() => void) | null = null;
  let unsubscribeLifecycle: (() => void) | null = null;
  let backgroundTimer: TimerHandle | null = null;
  let pausedInBackground = false;

  function clearBackgroundTimer(): void {
    if (backgroundTimer !== null) {
      cancelTimeout(backgroundTimer);
      backgroundTimer = null;
    }
  }

  function handleNetworkChange(next: NetworkState): void {
    if (next === "offline") {
      options.onOffline();
      return;
    }
    options.onOnline(pausedInBackground);
  }

  function handleLifecycleChange(next: LifecycleState): void {
    if (next === "background") {
      clearBackgroundTimer();
      backgroundTimer = scheduleTimeout(() => {
        backgroundTimer = null;
        pausedInBackground = true;
        options.onBackgroundPause();
      }, options.backgroundGraceMs);
      return;
    }
    clearBackgroundTimer();
    if (pausedInBackground) {
      pausedInBackground = false;
      options.onForegroundResume();
    }
  }

  function start(): void {
    pausedInBackground = options.lifecycle?.getState() === "background";
    unsubscribeNetwork = options.network.subscribe(handleNetworkChange);
    unsubscribeLifecycle = options.lifecycle?.subscribe(handleLifecycleChange) ?? null;
  }

  function stop(): void {
    unsubscribeNetwork?.();
    unsubscribeNetwork = null;
    unsubscribeLifecycle?.();
    unsubscribeLifecycle = null;
    clearBackgroundTimer();
    pausedInBackground = false;
  }

  return {
    start,
    stop,
    isOffline: () => options.network.getState() === "offline",
    isPausedInBackground: () => pausedInBackground,
  };
}

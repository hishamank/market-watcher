import type { AppLifecycle, LifecycleState } from "@mini/core";

function readLifecycleState(): LifecycleState {
  if (typeof document === "undefined" || document.visibilityState !== "hidden") {
    return "foreground";
  }
  return "background";
}

export function createPageVisibility(): AppLifecycle {
  return {
    getState: readLifecycleState,
    subscribe(listener) {
      if (typeof document === "undefined") {
        return () => {};
      }
      const onChange = () => listener(readLifecycleState());
      document.addEventListener("visibilitychange", onChange);
      return () => document.removeEventListener("visibilitychange", onChange);
    },
  };
}

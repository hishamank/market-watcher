import type { AppLifecycle, LifecycleState } from "@mini/core";
import { AppState } from "react-native";

function toLifecycleState(status: string | null | undefined): LifecycleState {
  return status === "background" ? "background" : "foreground";
}

export function createAppStateLifecycle(): AppLifecycle {
  return {
    getState: () => toLifecycleState(AppState.currentState),
    subscribe(listener) {
      let last = toLifecycleState(AppState.currentState);
      const subscription = AppState.addEventListener("change", (status) => {
        const next = toLifecycleState(status);
        if (next === last) return;
        last = next;
        listener(next);
      });
      return () => subscription.remove();
    },
  };
}

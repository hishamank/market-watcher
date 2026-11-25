import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const listeners = new Set<() => void>();
let systemSetting: boolean | undefined;
let watching = false;

function setSystemSetting(value: boolean): void {
  if (systemSetting === value) return;
  systemSetting = value;
  for (const listener of Array.from(listeners)) listener();
}

function watchSystemSetting(): void {
  watching = true;
  AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemSetting);
  AccessibilityInfo.isReduceMotionEnabled().then(
    (value) => {
      if (systemSetting === undefined) setSystemSetting(value);
    },
    () => {},
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!watching) watchSystemSetting();
  return () => listeners.delete(listener);
}

export function useReduceMotion(): boolean {
  const atLaunch = useReducedMotion();
  return useSyncExternalStore(subscribe, () => systemSetting ?? atLaunch);
}

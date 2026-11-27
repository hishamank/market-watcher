import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

export const SAVED_DEBUG_TOOLS_KEY = "debug-tools:v1";

const listeners = new Set<() => void>();
let enabled = false;
let chosen = false;

export function parseDebugTools(saved: string | null): boolean {
  return saved === "on";
}

function apply(next: boolean): void {
  enabled = next;
  for (const listener of Array.from(listeners)) listener();
}

export function chooseDebugTools(next: boolean): void {
  chosen = true;
  void AsyncStorage.setItem(SAVED_DEBUG_TOOLS_KEY, next ? "on" : "off");
  apply(next);
}

export function restoreDebugTools(saved: string | null): void {
  if (!chosen) apply(parseDebugTools(saved));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isDebugToolsOn(): boolean {
  return enabled;
}

export function useDebugTools(): boolean {
  return useSyncExternalStore(subscribe, isDebugToolsOn);
}

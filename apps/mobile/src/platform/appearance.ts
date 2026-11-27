import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

export const APPEARANCES = ["system", "light", "dark"] as const;
export type AppearanceChoice = (typeof APPEARANCES)[number];

export const SAVED_APPEARANCE_KEY = "color-scheme:v1";

const listeners = new Set<() => void>();
let current: AppearanceChoice = "system";
let chosen = false;

export function parseAppearance(saved: string | null): AppearanceChoice {
  return saved === "light" || saved === "dark" ? saved : "system";
}

function apply(choice: AppearanceChoice): void {
  current = choice;
  Appearance.setColorScheme(choice === "system" ? "auto" : choice);
  for (const listener of Array.from(listeners)) listener();
}

export function chooseAppearance(choice: AppearanceChoice): void {
  chosen = true;
  void AsyncStorage.setItem(SAVED_APPEARANCE_KEY, choice);
  apply(choice);
}

export function restoreAppearance(saved: string | null): void {
  if (!chosen) apply(parseAppearance(saved));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppearance(): AppearanceChoice {
  return useSyncExternalStore(subscribe, () => current);
}

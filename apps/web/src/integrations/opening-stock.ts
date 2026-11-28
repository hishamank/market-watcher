import { useEffect, useSyncExternalStore } from "react";

let opening: string | undefined;
const listeners = new Set<() => void>();

function publish(next: string | undefined): void {
  if (opening === next) return;
  opening = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markStockOpening(symbol: string): void {
  publish(symbol);
}

export function useIsStockOpening(symbol: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => opening === symbol,
    () => false,
  );
}

export function useStockOpened(symbol: string): void {
  useEffect(() => publish(undefined), [symbol]);
}

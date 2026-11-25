import { SNAPSHOT_REUSE_MS } from "./config.ts";

export interface SnapshotRequests {
  fetch(symbols: readonly string[]): Promise<void>;
  shouldAsk(symbol: string, now: number): boolean;
}

export function createSnapshotRequests(
  run: (symbols: readonly string[]) => Promise<void>,
  now: () => number,
): SnapshotRequests {
  const inFlight = new Map<string, Promise<void>>();
  const finished = new Map<string, number>();
  return {
    fetch(symbols) {
      const unique = [...new Set(symbols)];
      const fresh = unique.filter((symbol) => !inFlight.has(symbol));
      if (fresh.length > 0) {
        const call = run(fresh).finally(() => {
          const time = now();
          fresh.forEach((symbol) => {
            inFlight.delete(symbol);
            finished.set(symbol, time);
          });
        });
        fresh.forEach((symbol) => inFlight.set(symbol, call));
      }
      const calls = new Set(unique.flatMap((symbol) => inFlight.get(symbol) ?? []));
      return Promise.all(calls).then(() => undefined);
    },
    shouldAsk(symbol, time) {
      const last = finished.get(symbol);
      return inFlight.has(symbol) || last === undefined || last <= time - SNAPSHOT_REUSE_MS;
    },
  };
}

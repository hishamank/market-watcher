import { FeedModeSchema, type FeedMode } from "@mini/contracts";

export class FeedChangedError extends Error {
  constructor() {
    super("The market data source changed. Reload to start a new session.");
    this.name = "FeedChangedError";
  }
}

export interface FeedSession {
  isBlocked(): boolean;
  mode(): FeedMode | null;
  accept(mode: FeedMode): boolean;
  isCompatible(data: readonly unknown[]): boolean;
  check(data?: unknown): void;
  subscribe(listener: () => void): () => void;
}

function modesIn(data: unknown): FeedMode[] {
  if (typeof data !== "object" || data === null) return [];
  if ("pages" in data && Array.isArray(data.pages)) return data.pages.flatMap(modesIn);
  if ("feedMode" in data) {
    const parsed = FeedModeSchema.safeParse(data.feedMode);
    return parsed.success ? [parsed.data] : [];
  }
  if ("source" in data && data.source === "simulated") return ["simulated"];
  if ("source" in data && data.source === "yahoo") return ["live"];
  return [];
}

export function createFeedSession(initialMode: FeedMode | null = null): FeedSession {
  let current = initialMode;
  let blocked = false;
  const listeners = new Set<() => void>();
  function accept(mode: FeedMode): boolean {
    if (blocked) return false;
    if (current !== null && current !== mode) {
      blocked = true;
      for (const listener of Array.from(listeners)) listener();
      return false;
    }
    current = mode;
    return true;
  }
  return {
    isBlocked: () => blocked,
    mode: () => current,
    accept,
    isCompatible(data) {
      const modes = data.flatMap(modesIn);
      const expected = current ?? modes[0];
      return !blocked && modes.every((mode) => mode === expected);
    },
    check(data) {
      if (blocked || !modesIn(data).every(accept)) throw new FeedChangedError();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

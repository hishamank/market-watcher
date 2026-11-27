import type { FeedMode } from "@mini/contracts";
import { addListener, notifyAll } from "./listeners.ts";

export interface FeedModeStore {
  get(): FeedMode | null;
  learn(feedMode: FeedMode): void;
  subscribe(listener: () => void): () => void;
}

export function createFeedModeStore(): FeedModeStore {
  const listeners = new Set<() => void>();
  let current: FeedMode | null = null;

  return {
    get: () => current,
    learn(feedMode) {
      if (current !== null) return;
      current = feedMode;
      notifyAll(listeners);
    },
    subscribe: (listener) => addListener(listeners, listener),
  };
}

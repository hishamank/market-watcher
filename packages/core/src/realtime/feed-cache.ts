import type { QueryCache } from "@tanstack/react-query";
import type { FeedSession } from "./feed-session.ts";

export function checkCachedFeed(cache: QueryCache, session: FeedSession): void {
  for (const query of cache.getAll()) {
    try {
      session.check(query.state.data);
    } catch {
      return;
    }
  }
}

export function watchCachedFeed(cache: QueryCache, session: FeedSession): () => void {
  checkCachedFeed(cache, session);
  return cache.subscribe((event) => {
    if (event.type === "added" || event.type === "updated") checkCachedFeed(cache, session);
  });
}

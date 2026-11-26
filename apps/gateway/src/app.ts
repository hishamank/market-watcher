import websocket from "@fastify/websocket";
import type { FeedMode } from "@mini/contracts";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { Feed, HistorySource } from "./feeds/types.ts";
import { createHub } from "./hub/hub.ts";
import { MAX_MESSAGE_BYTES } from "./hub/limits.ts";
import { registerRestPlugins, type RestRateLimitOptions } from "./rest/plugins.ts";
import { restRoute } from "./rest/route.ts";
import { socketRoute } from "./socket/route.ts";

import { profileRoute } from "./profiles/route.ts";
import type { ProfileSource } from "./profiles/source.ts";

import { statisticsRoute } from "./statistics/route.ts";
import type { StatisticsSource } from "./statistics/source.ts";

import { newsRoute } from "./news/route.ts";
import type { NewsSource } from "./news/source.ts";

import { earningsRoute } from "./earnings/route.ts";
import type { EarningsSource } from "./earnings/source.ts";

export { parseRateLimitMax, parseTrustProxy } from "./rest/plugins.ts";

export interface AppOptions {
  feed: Feed;
  feedMode: FeedMode;
  allowedOrigins: ReadonlySet<string>;
  now?: () => number;
  logger?: FastifyServerOptions["logger"];
  trustProxy?: FastifyServerOptions["trustProxy"];
  historyFallbacks?: readonly HistorySource[];
  historyCacheMaxEntries?: number;
  historySourceTimeoutMs?: number;
  rateLimit?: RestRateLimitOptions;
  earningsSource?: EarningsSource;
  earningsTimeoutMs?: number;
  newsSource?: NewsSource;
  newsTimeoutMs?: number;
  statisticsSource?: StatisticsSource;
  statisticsTimeoutMs?: number;
  profileSource?: ProfileSource;
  profileTimeoutMs?: number;
}

export function buildApp({
  now = () => Date.now(),
  logger = true,
  trustProxy = false,
  historyFallbacks,
  historyCacheMaxEntries,
  historySourceTimeoutMs,
  rateLimit,
  ...options
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger, trustProxy });
  const hub = createHub({
    feed: options.feed,
    now,
    warn: (detail, message) => app.log.warn(detail, message),
  });
  app.register(async (hubScope) => {
    hubScope.addHook("onClose", () => hub.close());
  });
  registerRestPlugins(app, {
    ...options,
    now,
    ...(rateLimit !== undefined ? { rateLimit } : {}),
  });
  app.register(restRoute, {
    feed: options.feed,
    feedMode: options.feedMode,
    now,
    connectionStats: hub.stats,
    ...(historyFallbacks !== undefined ? { historyFallbacks } : {}),
    ...(historyCacheMaxEntries !== undefined ? { historyCacheMaxEntries } : {}),
    ...(historySourceTimeoutMs !== undefined ? { historySourceTimeoutMs } : {}),
  });
  app.register(profileRoute, {
    catalogue: options.feed.catalogue,
    feedMode: options.feedMode,
    now,
    ...(options.profileSource ? { profileSource: options.profileSource } : {}),
    ...(options.profileTimeoutMs !== undefined
      ? { profileTimeoutMs: options.profileTimeoutMs }
      : {}),
  });
  app.register(statisticsRoute, {
    catalogue: options.feed.catalogue,
    feedMode: options.feedMode,
    now,
    ...(options.statisticsSource ? { statisticsSource: options.statisticsSource } : {}),
    ...(options.statisticsTimeoutMs !== undefined
      ? { statisticsTimeoutMs: options.statisticsTimeoutMs }
      : {}),
  });
  app.register(newsRoute, {
    catalogue: options.feed.catalogue,
    feedMode: options.feedMode,
    now,
    ...(options.newsSource ? { newsSource: options.newsSource } : {}),
    ...(options.newsTimeoutMs !== undefined ? { newsTimeoutMs: options.newsTimeoutMs } : {}),
  });
  app.register(earningsRoute, {
    catalogue: options.feed.catalogue,
    feedMode: options.feedMode,
    now,
    ...(options.earningsSource ? { earningsSource: options.earningsSource } : {}),
    ...(options.earningsTimeoutMs !== undefined
      ? { earningsTimeoutMs: options.earningsTimeoutMs }
      : {}),
  });
  app.register(websocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });
  app.register(socketRoute, { ...options, now, hub });
  return app;
}

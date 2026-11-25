import websocket from "@fastify/websocket";
import type { FeedMode } from "@mini/contracts";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { Feed, HistorySource } from "./feeds/types.ts";
import { MAX_MESSAGE_BYTES } from "./hub/limits.ts";
import { registerRestPlugins, type RestRateLimitOptions } from "./rest/plugins.ts";
import { restRoute } from "./rest/route.ts";
import { socketRoute } from "./socket/route.ts";

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
  registerRestPlugins(app, {
    ...options,
    now,
    ...(rateLimit !== undefined ? { rateLimit } : {}),
  });
  app.register(restRoute, {
    feed: options.feed,
    feedMode: options.feedMode,
    now,
    ...(historyFallbacks !== undefined ? { historyFallbacks } : {}),
    ...(historyCacheMaxEntries !== undefined ? { historyCacheMaxEntries } : {}),
    ...(historySourceTimeoutMs !== undefined ? { historySourceTimeoutMs } : {}),
  });
  app.register(websocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });
  app.register(socketRoute, { ...options, now });
  return app;
}

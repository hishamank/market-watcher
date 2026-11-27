import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { FeedMode } from "@mini/contracts";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import type { Feed } from "../feeds/types.ts";
import { addressKey } from "../socket/address-key.ts";
import { registerErrorHandlers, RestError } from "./errors.ts";
import { REST_RATE_LIMIT_MAX, REST_RATE_LIMIT_WINDOW_MS } from "./limits.ts";

export interface RestRateLimitOptions {
  max: number;
  timeWindow: number;
}

export interface RestPluginsOptions {
  feed: Feed;
  feedMode: FeedMode;
  allowedOrigins: ReadonlySet<string>;
  now: () => number;
  rateLimit?: RestRateLimitOptions;
}

export function parseTrustProxy(
  value: string | undefined,
): NonNullable<FastifyServerOptions["trustProxy"]> {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "false" || trimmed === "0") {
    return false;
  }
  if (trimmed === "true") {
    return true;
  }
  if (/^[1-9]\d*$/.test(trimmed)) {
    const hops = Number(trimmed);
    return (_address: string, hop: number) => hop < hops;
  }
  const items = trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.length === 1 ? (items[0] ?? false) : items;
}

export function parseRateLimitMax(value: string | undefined): RestRateLimitOptions | undefined {
  const trimmed = value?.trim();
  if (trimmed === undefined || !/^[1-9]\d*$/.test(trimmed)) return undefined;
  const max = Number(trimmed);
  return Number.isSafeInteger(max) ? { max, timeWindow: REST_RATE_LIMIT_WINDOW_MS } : undefined;
}

export function registerRestPlugins(app: FastifyInstance, options: RestPluginsOptions): void {
  registerErrorHandlers(app, options.feed, options.feedMode, options.now);

  app.register(cors, {
    origin(origin, callback) {
      if (origin === undefined || options.allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "OPTIONS"],
  });

  app.register(rateLimit, {
    max: options.rateLimit?.max ?? REST_RATE_LIMIT_MAX,
    timeWindow: options.rateLimit?.timeWindow ?? REST_RATE_LIMIT_WINDOW_MS,
    allowList: (request) => request.routeOptions.url === "/ws",
    keyGenerator: (request) => addressKey(request.ip),
    errorResponseBuilder: (_request, context) =>
      new RestError(429, "rate_limited", `Rate limit exceeded, retry in ${context.after}`),
  });
}

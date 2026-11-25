import websocket from "@fastify/websocket";
import type { FeedMode } from "@mini/contracts";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { Feed } from "./feeds/types.ts";
import { MAX_MESSAGE_BYTES } from "./hub/limits.ts";
import { socketRoute } from "./socket/route.ts";

export interface AppOptions {
  feed: Feed;
  feedMode: FeedMode;
  allowedOrigins: ReadonlySet<string>;
  now?: () => number;
  logger?: FastifyServerOptions["logger"];
}

export function buildApp({
  now = () => Date.now(),
  logger = true,
  ...options
}: AppOptions): FastifyInstance {
  const app = Fastify({ logger });
  app.get("/stocks", async () => ({
    feedMode: "simulated",
    marketStatus: "open",
    stocks: [],
  }));
  app.register(websocket, { options: { maxPayload: MAX_MESSAGE_BYTES } });
  app.register(socketRoute, { ...options, now });
  return app;
}

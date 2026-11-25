import { encodeFrame, type FeedMode, PROTOCOL_VERSION } from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import type { Feed } from "../feeds/types.ts";
import { createHub, type Hub } from "../hub/hub.ts";
import type { Warn } from "../hub/quote-book.ts";
import {
  CLOSE_UNSUPPORTED_VERSION,
  HEARTBEAT_INTERVAL_MS,
  MAX_SUBSCRIPTIONS,
  PING_INTERVAL_MS,
} from "../hub/limits.ts";
import { createAdmission } from "./admission.ts";
import { startLiveness } from "./liveness.ts";
import { closeWithDeadline, openSession } from "./session.ts";

export interface SocketOptions {
  feed: Feed;
  feedMode: FeedMode;
  allowedOrigins: ReadonlySet<string>;
  now: () => number;
}

function rejectVersion(socket: WebSocket): void {
  const message = `Supported protocol version is ${PROTOCOL_VERSION}, connect to /ws?v=${PROTOCOL_VERSION}`;
  socket.send(encodeFrame({ type: "error", code: "unsupported_version", message }));
  closeWithDeadline(socket, CLOSE_UNSUPPORTED_VERSION, "Unsupported protocol version");
}

function welcome(socket: WebSocket, hub: Hub, options: SocketOptions): void {
  socket.send(
    encodeFrame({
      type: "welcome",
      protocolVersion: PROTOCOL_VERSION,
      feedMode: options.feedMode,
      marketStatus: hub.marketStatus(),
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      maxSubscriptions: MAX_SUBSCRIPTIONS,
      serverTime: options.now(),
    }),
  );
}

export async function socketRoute(app: FastifyInstance, options: SocketOptions): Promise<void> {
  const warn: Warn = (detail, message) => app.log.warn(detail, message);
  const hub = createHub({ feed: options.feed, now: options.now, warn });
  const admission = createAdmission(options.allowedOrigins);
  const stopLiveness = startLiveness(app.websocketServer, PING_INTERVAL_MS);
  app.addHook("onClose", async () => {
    stopLiveness();
    await hub.close();
  });

  app.get<{ Querystring: { v?: string } }>(
    "/ws",
    { websocket: true, preValidation: admission.check },
    (socket, request) => {
      admission.opened(request.ip);
      socket.once("close", () => admission.closed(request.ip));
      if (request.query.v !== String(PROTOCOL_VERSION)) {
        rejectVersion(socket);
        return;
      }
      welcome(socket, hub, options);
      openSession(socket, hub, options.now, warn);
    },
  );
}

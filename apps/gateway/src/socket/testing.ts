import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { encodeFrame, type FeedMode, parseServerFrame, type ServerMessage } from "@mini/contracts";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { type ClientOptions, WebSocket } from "ws";
import { buildApp } from "../app.ts";
import type { Feed } from "../feeds/types.ts";
import { createFakeFeed, type FakeFeed } from "../hub/fake-feed.ts";

export const ALLOWED_ORIGIN = "http://localhost:3000";

type MessageOf<Type extends ServerMessage["type"]> = Extract<ServerMessage, { type: Type }>;

export interface Gateway<F extends Feed = FakeFeed> {
  readonly app: FastifyInstance;
  readonly feed: F;
  url(query?: string): string;
  connect(options?: { query?: string } & ClientOptions): Promise<TestClient>;
  close(): Promise<void>;
}

export interface TestClient {
  readonly socket: WebSocket;
  readonly received: ServerMessage[];
  readonly closed: Promise<number>;
  next<Type extends ServerMessage["type"]>(type: Type): Promise<MessageOf<Type>>;
  all<Type extends ServerMessage["type"]>(type: Type): MessageOf<Type>[];
  send(message: Parameters<typeof encodeFrame>[0]): void;
  settle(): Promise<void>;
}

function wrap(socket: WebSocket): TestClient {
  const received: ServerMessage[] = [];
  const taken = new Set<ServerMessage>();
  const waiters = new Set<() => void>();
  socket.on("message", (data) => {
    const frame = parseServerFrame(data.toString());
    if (!frame.ok) {
      throw new Error(`server sent an invalid frame: ${frame.error.detail}`);
    }
    received.push(frame.message);
    waiters.forEach((wake) => wake());
  });

  function next<Type extends ServerMessage["type"]>(type: Type): Promise<MessageOf<Type>> {
    return new Promise((resolve) => {
      const look = () => {
        const found = received.find((message) => message.type === type && !taken.has(message));
        if (found) {
          taken.add(found);
          waiters.delete(look);
          resolve(found as MessageOf<Type>);
        }
      };
      waiters.add(look);
      look();
    });
  }

  return {
    socket,
    received,
    closed: new Promise((resolve) => socket.once("close", resolve)),
    next,
    all: (type) => received.filter((message) => message.type === type) as never,
    send: (message) => socket.send(encodeFrame(message)),
    async settle() {
      socket.ping();
      await once(socket, "pong");
    },
  };
}

export async function startGateway<F extends Feed = FakeFeed>(
  feed: F = createFakeFeed({ recordCalls: true }) as unknown as F,
  logger: FastifyServerOptions["logger"] = false,
  feedMode: FeedMode = "simulated",
  now: () => number = () => Date.now(),
): Promise<Gateway<F>> {
  const app = buildApp({
    feed,
    feedMode,
    now,
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    logger,
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  const url = (query = "v=1") => `ws://127.0.0.1:${port}/ws?${query}`;
  return {
    app,
    feed,
    url,
    async connect({ query, ...options } = {}) {
      const socket = new WebSocket(url(query), options);
      const client = wrap(socket);
      await once(socket, "open");
      return client;
    },
    close: () => app.close(),
  };
}

export function serverSockets(gateway: Gateway<Feed>): WebSocket[] {
  return [...gateway.app.websocketServer.clients];
}

export function fakeTimers(): { toFake: ("setInterval" | "clearInterval" | "Date")[] } {
  return { toFake: ["setInterval", "clearInterval", "Date"] };
}

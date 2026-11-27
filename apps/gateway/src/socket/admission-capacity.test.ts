import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterEach, expect, test } from "vitest";
import { WebSocket } from "ws";
import { buildApp } from "../app.ts";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { CONNECTIONS_PER_IP } from "../hub/limits.ts";
import { addressKey } from "./address-key.ts";

let app: FastifyInstance | undefined;
const sockets: WebSocket[] = [];

afterEach(async () => {
  sockets.splice(0).forEach((socket) => socket.terminate());
  await app?.close();
  app = undefined;
});

async function start(maxConnections?: number): Promise<number> {
  app = buildApp({
    feed: createFakeFeed(),
    feedMode: "simulated",
    allowedOrigins: new Set(),
    logger: false,
    trustProxy: true,
    rateLimit: { max: 3, timeWindow: 60_000 },
    ...(maxConnections !== undefined ? { maxConnections } : {}),
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  return (app.server.address() as AddressInfo).port;
}

async function connect(port: number, from: string): Promise<number | "open"> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?v=1`, {
    headers: { "X-Forwarded-For": from },
  });
  sockets.push(socket);
  socket.on("error", () => undefined);
  return Promise.race([
    once(socket, "unexpected-response").then(([, response]) => response.statusCode as number),
    once(socket, "open").then(() => "open" as const),
  ]);
}

test("an IPv6 address is budgeted by its /64 and an IPv4 address by itself", () => {
  expect(addressKey("2001:db8:aa:bb:1:2:3:4")).toBe("2001:db8:aa:bb::/64");
  expect(addressKey("2001:db8:aa:bb::9")).toBe("2001:db8:aa:bb::/64");
  expect(addressKey("2001:0DB8:00aa:00bb:ffff::1")).toBe("2001:db8:aa:bb::/64");
  expect(addressKey("2001:db8:aa:bc::9")).toBe("2001:db8:aa:bc::/64");
  expect(addressKey("::1")).toBe("0:0:0:0::/64");
  expect(addressKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  expect(addressKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  expect(addressKey("203.0.113.7")).toBe("203.0.113.7");
});

test("addresses in one /64 share the connection budget and another /64 does not", async () => {
  const port = await start();
  for (let host = 1; host <= CONNECTIONS_PER_IP; host += 1) {
    await expect(connect(port, `2001:db8:1:1::${host.toString(16)}`)).resolves.toBe("open");
  }
  await expect(connect(port, "2001:db8:1:1:ffff:ffff:ffff:ffff")).resolves.toBe(429);
  await expect(connect(port, "2001:db8:1:2::1")).resolves.toBe("open");
});

test("the REST limit follows the same /64 key", async () => {
  await start();
  const from = (host: number) => ({ "x-forwarded-for": `2001:db8:7:7::${host}` });
  const codes: number[] = [];
  for (let host = 1; host <= 4; host += 1) {
    codes.push((await app!.inject({ url: "/health", headers: from(host) })).statusCode);
  }
  expect(codes).toEqual([200, 200, 200, 429]);
  const other = await app!.inject({
    url: "/health",
    headers: { "x-forwarded-for": "2001:db8:7:8::1" },
  });
  expect(other.statusCode).toBe(200);
});

test("the gateway refuses sockets past its total cap and admits again when one closes", async () => {
  const port = await start(3);
  for (const host of [1, 2, 3]) {
    await expect(connect(port, `198.51.100.${host}`)).resolves.toBe("open");
  }
  await expect(connect(port, "198.51.100.4")).resolves.toBe(503);

  const first = sockets[0]!;
  first.close();
  await once(first, "close");
  await expect.poll(() => connect(port, "198.51.100.5")).toBe("open");
});

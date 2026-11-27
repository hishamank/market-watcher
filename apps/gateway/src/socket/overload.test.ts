import { once } from "node:events";
import { afterEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import {
  ABUSE_COOLDOWN_MS,
  CLOSE_POLICY_VIOLATION,
  MAX_OVER_LIMIT_MESSAGES,
  MAX_PENDING_OPERATIONS,
  MESSAGES_PER_SECOND,
} from "../hub/limits.ts";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

async function health(): Promise<{ connections: number; upstreamSymbols: number }> {
  const response = await gateway!.app.inject({ url: "/health" });
  return response.json();
}

async function refusedStatus(url: string): Promise<number | "open"> {
  const socket = new WebSocket(url);
  socket.on("error", () => undefined);
  const outcome = await Promise.race([
    once(socket, "unexpected-response").then(([, response]) => response.statusCode as number),
    once(socket, "open").then(() => "open" as const),
  ]);
  socket.terminate();
  return outcome;
}

test("a blocked peer that queues past the bound is closed and leaves nothing behind", async () => {
  gateway = await startGateway();
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await client.next("snapshot");

  client.send({ type: "chaos", action: "freeze", enabled: true });
  client.send({ type: "subscribe", requestId: 2, symbols: ["NVDA"] });
  for (let sent = 0; sent < MAX_PENDING_OPERATIONS + 4; sent += 1) {
    client.send({ type: "unsubscribe", symbols: ["MSFT"] });
  }

  await expect(client.closed).resolves.toBe(CLOSE_POLICY_VIOLATION);
  await vi.waitFor(async () =>
    expect(await health()).toMatchObject({ connections: 0, upstreamSymbols: 0 }),
  );
  await vi.waitFor(() => expect(gateway?.feed.upstream()).toEqual([]));
});

test("refusals waiting on a blocked peer count against the same bound", async () => {
  gateway = await startGateway();
  const client = await gateway.connect();
  await client.next("welcome");

  client.send({ type: "chaos", action: "freeze", enabled: true });
  for (let sent = 1; sent <= MAX_PENDING_OPERATIONS + 4; sent += 1) {
    client.send({ type: "subscribe", requestId: sent, symbols: ["AAPL"] });
  }

  await expect(client.closed).resolves.toBe(CLOSE_POLICY_VIOLATION);
  await vi.waitFor(async () =>
    expect(await health()).toMatchObject({ connections: 0, upstreamSymbols: 0 }),
  );
});

test("sustained over-limit traffic closes the socket and cools the address down", async () => {
  let time = Date.UTC(2026, 10, 25, 14, 0, 0);
  const feed = createFakeFeed({ recordCalls: true });
  gateway = await startGateway(feed, false, "simulated", () => time);
  const client = await gateway.connect();
  await client.next("welcome");

  for (let sent = 0; sent < MESSAGES_PER_SECOND + MAX_OVER_LIMIT_MESSAGES + 1; sent += 1) {
    client.socket.send("not a frame");
  }

  await expect(client.closed).resolves.toBe(CLOSE_POLICY_VIOLATION);
  expect(client.all("error").filter((error) => error.code === "rate_limited")).toHaveLength(1);
  await expect(refusedStatus(client.socket.url)).resolves.toBe(429);

  time += ABUSE_COOLDOWN_MS;
  await expect(refusedStatus(client.socket.url)).resolves.toBe("open");
});

test("a burst of valid unsubscribes below the bound is applied and the socket stays usable", async () => {
  gateway = await startGateway();
  const client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "NVDA"] });
  await client.next("snapshot");

  for (let sent = 0; sent < 200; sent += 1) {
    client.send({ type: "unsubscribe", symbols: [sent % 2 === 0 ? "AAPL" : "NVDA"] });
  }
  await vi.waitFor(() => expect(gateway?.feed.upstream()).toEqual([]));
  await client.settle();
  expect(client.socket.readyState).toBe(WebSocket.OPEN);

  await vi.waitFor(async () => {
    const requestId = Date.now();
    client.send({ type: "subscribe", requestId, symbols: ["AAPL"] });
    await client.settle();
    expect(client.all("snapshot").some((reply) => reply.requestId === requestId)).toBe(true);
  });
  expect(gateway?.feed.upstream()).toEqual(["AAPL"]);
});

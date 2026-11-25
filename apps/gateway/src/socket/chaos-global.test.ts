import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { encodeFrame, parseServerFrame, type ServerMessage } from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import { afterEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import { buildApp } from "../app.ts";
import { createSimulatorFeed, type SimulatorFeed } from "../feeds/simulator/index.ts";
import { CHAOS_REVERT_MS } from "../hub/limits.ts";
import { ALLOWED_ORIGIN } from "./testing.ts";

const ALL_TIMERS = {
  toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] as const,
};

interface SimClient {
  socket: WebSocket;
  received: ServerMessage[];
  send: (message: Parameters<typeof encodeFrame>[0]) => void;
  settle: () => Promise<void>;
  next: <Type extends ServerMessage["type"]>(
    type: Type,
  ) => Promise<Extract<ServerMessage, { type: Type }>>;
}

let app: FastifyInstance | undefined;
let feed: SimulatorFeed | undefined;
const sockets: WebSocket[] = [];

async function connectClient(port: number): Promise<SimClient> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?v=1`);
  sockets.push(socket);
  const received: ServerMessage[] = [];
  const taken = new Set<ServerMessage>();
  const waiters = new Set<() => void>();
  socket.on("message", (data) => {
    const parsed = parseServerFrame(data.toString());
    if (!parsed.ok) throw new Error(parsed.error.detail);
    received.push(parsed.message);
    waiters.forEach((wake) => wake());
  });
  await once(socket, "open");
  return {
    socket,
    received,
    send: (message) => socket.send(encodeFrame(message)),
    async settle() {
      socket.ping();
      await once(socket, "pong");
    },
    next(type) {
      return new Promise((resolve) => {
        const look = () => {
          const found = received.find((msg) => msg.type === type && !taken.has(msg));
          if (found) {
            taken.add(found);
            waiters.delete(look);
            resolve(found as never);
          }
        };
        waiters.add(look);
        look();
      });
    },
  };
}

async function startSimGateway(seed = "chaos-gateway-test") {
  vi.setSystemTime(Date.UTC(2026, 10, 25, 14, 0, 0));
  const clock = () => Date.now();
  feed = createSimulatorFeed({ seed, clock, random: () => 0.5 });
  app = buildApp({
    feed,
    feedMode: "simulated",
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    now: clock,
    logger: false,
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  return { app, feed, connect: () => connectClient(port) };
}

afterEach(async () => {
  vi.useRealTimers();
  for (const socket of sockets.splice(0)) {
    if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
  }
  await app?.close();
  feed?.close();
  app = undefined;
  feed = undefined;
});

test("C2 tick spike produces many simulator ticks but at most 4 quotes frames a second", async () => {
  vi.useFakeTimers({ toFake: [...ALL_TIMERS.toFake] });
  const sim = await startSimGateway();
  let upstreamTicks = 0;
  const stopCounting = sim.feed.live.onQuote(() => {
    upstreamTicks += 1;
  });

  const client = await sim.connect();
  await client.next("welcome");
  await client.next("chaos_state");
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
  await client.next("snapshot");

  client.send({ type: "chaos", action: "tick_spike", enabled: true });
  await client.next("chaos_state");
  expect(sim.feed.getSettings().tickRateMultiplier).toBeGreaterThan(1);

  const beforeQuotes = client.received.filter((m) => m.type === "quotes").length;
  upstreamTicks = 0;
  await vi.advanceTimersByTimeAsync(1_000);
  await client.settle();

  const frames = client.received.filter((m) => m.type === "quotes").slice(beforeQuotes);
  expect(upstreamTicks).toBeGreaterThan(20);
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.length).toBeLessThanOrEqual(4);
  stopCounting();
});

test("C3 and G2 global controls broadcast countdown state, flip market_status and revert after 60 s", async () => {
  vi.useFakeTimers({ toFake: [...ALL_TIMERS.toFake] });
  const sim = await startSimGateway();
  const alice = await sim.connect();
  const bob = await sim.connect();
  await alice.next("chaos_state");
  await bob.next("chaos_state");

  const startTime = Date.now();
  alice.send({ type: "chaos", action: "tick_spike", enabled: true });
  alice.send({ type: "chaos", action: "history_latency", enabled: true });
  alice.send({ type: "chaos", action: "history_failure_rate", rate: 50 });
  alice.send({ type: "chaos", action: "force_closed", enabled: true });
  await alice.settle();
  await bob.settle();

  expect(sim.feed.getSettings()).toMatchObject({
    historyLatencyMs: 2_000,
    historyFailureRate: 0.5,
    forceClosed: true,
  });
  expect(sim.feed.getSettings().tickRateMultiplier).toBeGreaterThan(1);
  expect(await bob.next("market_status")).toEqual({
    type: "market_status",
    marketStatus: "closed",
  });

  const lateJoiner = await sim.connect();
  expect(await lateJoiner.next("chaos_state")).toMatchObject({
    tickSpike: { enabled: true, revertsAt: startTime + CHAOS_REVERT_MS },
    historyLatency: { enabled: true, revertsAt: startTime + CHAOS_REVERT_MS },
    historyFailureRate: { rate: 50, revertsAt: startTime + CHAOS_REVERT_MS },
    forceClosed: { enabled: true, revertsAt: startTime + CHAOS_REVERT_MS },
  });

  await vi.advanceTimersByTimeAsync(CHAOS_REVERT_MS - 1);
  expect(sim.feed.getSettings().forceClosed).toBe(true);

  await vi.advanceTimersByTimeAsync(1);
  await bob.settle();
  await lateJoiner.settle();

  expect(sim.feed.getSettings()).toEqual({
    tickRateMultiplier: 1,
    historyLatencyMs: 0,
    historyFailureRate: 0,
    forceClosed: false,
  });
  expect(await bob.next("market_status")).toEqual({ type: "market_status", marketStatus: "open" });
  expect(lateJoiner.received.findLast((m) => m.type === "chaos_state")).toMatchObject({
    tickSpike: { enabled: false, revertsAt: null },
    historyLatency: { enabled: false, revertsAt: null },
    historyFailureRate: { rate: 0, revertsAt: null },
    forceClosed: { enabled: false, revertsAt: null },
  });
});

test("revert timers are cleared on app close", async () => {
  vi.useFakeTimers({ toFake: [...ALL_TIMERS.toFake] });
  const sim = await startSimGateway();
  const spy = vi.spyOn(sim.feed, "updateSettings");
  const client = await sim.connect();
  await client.next("chaos_state");

  client.send({ type: "chaos", action: "history_failure_rate", rate: 100 });
  await client.next("chaos_state");
  expect(spy).toHaveBeenCalledTimes(1);

  client.socket.terminate();
  await sim.app.close();
  app = undefined;

  await vi.advanceTimersByTimeAsync(CHAOS_REVERT_MS + 1_000);
  expect(spy).toHaveBeenCalledTimes(1);
});

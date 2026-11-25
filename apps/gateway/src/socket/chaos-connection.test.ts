import { once } from "node:events";
import type { AddressInfo } from "node:net";
import {
  type ChaosMessage,
  encodeFrame,
  parseServerFrame,
  type ServerMessage,
} from "@mini/contracts";
import { afterEach, expect, test, vi } from "vitest";
import { WebSocket } from "ws";
import { buildApp } from "../app.ts";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { ALLOWED_ORIGIN, fakeTimers, type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  vi.useRealTimers();
  await gateway?.close();
  gateway = undefined;
});

test("drop closes only the requesting connection and releases its subscriptions", async () => {
  gateway = await startGateway();
  const alice = await gateway.connect();
  const bob = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "NVDA"] });
  bob.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.next("snapshot");
  await bob.next("snapshot");

  alice.send({ type: "chaos", action: "drop" });
  await expect(alice.closed).resolves.toBe(1000);
  await vi.waitFor(() => expect(gateway?.feed.upstream()).toEqual(["AAPL"]));

  expect(bob.socket.readyState).toBe(WebSocket.OPEN);
  gateway.feed.tick("AAPL", "210.00");
  await expect(bob.next("quotes")).resolves.toMatchObject({
    quotes: [{ symbol: "AAPL", price: "210.00" }],
  });
});

test("freeze silences only the requesting connection, including heartbeats", async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
  const alice = await gateway.connect();
  const bob = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  bob.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.next("snapshot");
  await bob.next("snapshot");

  alice.send({ type: "chaos", action: "freeze", enabled: true });
  await alice.settle();
  const aliceBefore = alice.received.length;
  const bobBefore = bob.received.length;

  gateway.feed.tick("AAPL", "211.00");
  gateway.feed.setStatus("closed");
  vi.advanceTimersByTime(5_000);
  await alice.settle();
  await bob.settle();

  expect(alice.received.slice(aliceBefore)).toEqual([]);
  expect(bob.received.slice(bobBefore).map((message) => message.type)).toEqual(
    expect.arrayContaining(["quotes", "market_status", "heartbeat"]),
  );

  alice.send({ type: "chaos", action: "freeze", enabled: false });
  await alice.settle();
  gateway.feed.tick("AAPL", "212.00");
  vi.advanceTimersByTime(250);
  await expect(alice.next("quotes")).resolves.toMatchObject({
    quotes: [{ symbol: "AAPL", price: "212.00" }],
  });
});

test("a subscribe sent while frozen is answered once the freeze lifts", async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
  const alice = await gateway.connect();
  alice.send({ type: "chaos", action: "freeze", enabled: true });
  await alice.settle();
  alice.send({ type: "subscribe", requestId: 42, symbols: ["AAPL"] });
  await alice.settle();
  vi.advanceTimersByTime(1_000);
  await alice.settle();
  expect(alice.received.filter((message) => message.type === "snapshot")).toEqual([]);

  alice.send({ type: "chaos", action: "freeze", enabled: false });
  await alice.settle();
  vi.advanceTimersByTime(250);
  await expect(alice.next("snapshot")).resolves.toMatchObject({ requestId: 42 });
});

test("a connection still frozen after 10 s is closed and releases its subscriptions", async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
  const alice = await gateway.connect();
  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.next("snapshot");
  alice.send({ type: "chaos", action: "freeze", enabled: true });
  await alice.settle();
  alice.send({ type: "subscribe", requestId: 2, symbols: ["NVDA"] });
  await alice.settle();

  vi.advanceTimersByTime(10_500);
  await expect(alice.closed).resolves.toBe(1013);
  await vi.waitFor(() => expect(gateway?.feed.upstream()).toEqual([]));
});

test("C1 chaos messages in Live mode are rejected with invalid_message", async () => {
  const app = buildApp({
    feed: createFakeFeed(),
    feedMode: "live",
    allowedOrigins: new Set([ALLOWED_ORIGIN]),
    logger: false,
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;

  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws?v=1`);
  const received: ServerMessage[] = [];
  socket.on("message", (data) => {
    const parsed = parseServerFrame(data.toString());
    if (parsed.ok) received.push(parsed.message);
  });
  await once(socket, "open");

  const actions: ChaosMessage[] = [
    { type: "chaos", action: "drop" },
    { type: "chaos", action: "freeze", enabled: true },
    { type: "chaos", action: "tick_spike", enabled: true },
    { type: "chaos", action: "history_latency", enabled: true },
    { type: "chaos", action: "history_failure_rate", rate: 100 },
    { type: "chaos", action: "force_closed", enabled: true },
  ];
  for (const message of actions) {
    socket.send(encodeFrame(message));
  }
  socket.ping();
  await once(socket, "pong");

  expect(socket.readyState).toBe(WebSocket.OPEN);
  expect(received.filter((message) => message.type === "chaos_state")).toEqual([]);
  const errors = received.filter((message) => message.type === "error");
  expect(errors).toHaveLength(actions.length);
  for (const error of errors) {
    expect(error).toMatchObject({ code: "invalid_message" });
  }

  socket.close();
  await once(socket, "close");
  await app.close();
});

import { once } from "node:events";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { fakeTimers, type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway;

beforeEach(async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
});

afterEach(async () => {
  await gateway.close();
  vi.useRealTimers();
});

test("a heartbeat arrives every 5 s with the server time", async () => {
  const client = await gateway.connect();
  const { serverTime } = await client.next("welcome");
  vi.advanceTimersByTime(4_999);
  await client.settle();
  expect(client.all("heartbeat")).toEqual([]);

  vi.advanceTimersByTime(1);
  await expect(client.next("heartbeat")).resolves.toMatchObject({ serverTime: serverTime + 5_000 });
  vi.advanceTimersByTime(5_000);
  await expect(client.next("heartbeat")).resolves.toMatchObject({
    serverTime: serverTime + 10_000,
  });
});

test("a client that never answers the protocol ping is closed", async () => {
  const client = await gateway.connect({ autoPong: false });
  const pinged = once(client.socket, "ping");
  vi.advanceTimersByTime(15_000);
  await pinged;
  expect(client.socket.readyState).toBe(client.socket.OPEN);

  vi.advanceTimersByTime(15_000);
  await expect(client.closed).resolves.toBe(1006);
});

test("an unsubscribe over the limit gets one anonymous rate_limited and is dropped", async () => {
  const client = await gateway.connect();
  for (let count = 0; count < 25; count += 1) {
    client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  }
  await client.settle();
  expect(client.all("error")).toEqual([
    { type: "error", code: "rate_limited", message: "Too many messages" },
  ]);

  vi.advanceTimersByTime(1_000);
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await expect(client.next("snapshot")).resolves.toMatchObject({ requestId: 1 });
});

test("22 subscribes in one window get 20 snapshots and 2 rate_limited with their IDs", async () => {
  const client = await gateway.connect();
  for (let requestId = 1; requestId <= 22; requestId += 1) {
    client.send({ type: "subscribe", requestId, symbols: ["AAPL"] });
  }
  await vi.waitFor(() => expect(client.all("snapshot")).toHaveLength(20));
  await client.settle();

  const snapshotIds = client.all("snapshot").map((snapshot) => snapshot.requestId);
  expect(snapshotIds).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  expect(client.all("error")).toEqual([
    { type: "error", code: "rate_limited", message: "Too many messages", requestId: 21 },
    { type: "error", code: "rate_limited", message: "Too many messages", requestId: 22 },
  ]);
});

test("rate limit enforces a rolling one-second window across the reset boundary", async () => {
  const client = await gateway.connect();
  for (let count = 0; count < 10; count += 1) {
    client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  }
  await client.settle();

  vi.advanceTimersByTime(600);
  for (let count = 0; count < 10; count += 1) {
    client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  }
  await client.settle();

  vi.advanceTimersByTime(400);
  for (let count = 0; count < 10; count += 1) {
    client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  }
  client.send({ type: "unsubscribe", symbols: ["AAPL"] });
  await client.settle();
  expect(client.all("error")).toEqual([
    { type: "error", code: "rate_limited", message: "Too many messages" },
  ]);

  vi.advanceTimersByTime(599);
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await client.settle();
  expect(client.all("snapshot")).toEqual([]);
  expect(client.all("error").at(-1)).toMatchObject({ code: "rate_limited", requestId: 1 });

  vi.advanceTimersByTime(1);
  client.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
  await expect(client.next("snapshot")).resolves.toMatchObject({
    requestId: 2,
    quotes: [{ symbol: "AAPL" }],
  });
});

test("an unsupported version gets the error and a close, never a welcome", async () => {
  const client = await gateway.connect({ query: "v=2" });
  await expect(client.closed).resolves.toBe(1002);
  expect(client.received).toEqual([
    expect.objectContaining({ type: "error", code: "unsupported_version" }),
  ]);
});

test("a message over 16 KB closes the socket with 1009", async () => {
  const client = await gateway.connect();
  client.socket.send(
    JSON.stringify({ type: "subscribe", requestId: 6, symbols: ["x".repeat(17_000)] }),
  );
  await expect(client.closed).resolves.toBe(1009);
});

test("origins outside the allowlist are refused, a missing origin is allowed", async () => {
  await expect(gateway.connect({ origin: "https://evil.example" })).rejects.toThrow("403");
  await expect(gateway.connect({ origin: "http://localhost:3000" })).resolves.toBeDefined();
  await expect(gateway.connect()).resolves.toBeDefined();
});

test("an eleventh connection from one address is refused", async () => {
  const clients = await Promise.all(Array.from({ length: 10 }, () => gateway.connect()));
  await expect(gateway.connect()).rejects.toThrow("429");

  clients[0]?.socket.close();
  await clients[0]?.closed;
  await vi.waitFor(async () => {
    const client = await gateway.connect();
    client.socket.close();
  });
});

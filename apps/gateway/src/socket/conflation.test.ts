import type { Socket } from "node:net";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  fakeTimers,
  type Gateway,
  serverSockets,
  startGateway,
  type TestClient,
} from "./testing.ts";

let gateway: Gateway;
let client: TestClient;

beforeEach(async () => {
  vi.useFakeTimers(fakeTimers());
  gateway = await startGateway();
  client = await gateway.connect();
  client.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
  await client.next("snapshot");
});

afterEach(async () => {
  await gateway.close();
  vi.useRealTimers();
});

function shadowBufferedAmount(bytes: { value: number }): void {
  const [socket] = serverSockets(gateway);
  Object.defineProperty(socket, "bufferedAmount", { get: () => bytes.value });
}

test("a tick spike reaches the client as at most 4 quotes frames a second", async () => {
  for (let step = 1; step <= 100; step += 1) {
    gateway.feed.tick(step % 2 === 0 ? "AAPL" : "MSFT", `${100 + step}.00`);
    vi.advanceTimersByTime(10);
  }
  await client.settle();

  const frames = client.all("quotes");
  expect(frames).toHaveLength(4);
  expect(frames.at(-1)?.quotes).toEqual([
    expect.objectContaining({ symbol: "AAPL", price: "200.00" }),
    expect.objectContaining({ symbol: "MSFT", price: "199.00" }),
  ]);
});

test("an idle connection gets no quotes frames", async () => {
  vi.advanceTimersByTime(1_000);
  await client.settle();
  expect(client.all("quotes")).toEqual([]);
});

test("a slow consumer is skipped, not queued, and gets only the latest prices", async () => {
  const buffered = { value: 70_000 };
  shadowBufferedAmount(buffered);
  for (let step = 1; step <= 20; step += 1) {
    gateway.feed.tick("AAPL", `${100 + step}.00`);
    vi.advanceTimersByTime(250);
  }
  await client.settle();
  expect(client.all("quotes")).toEqual([]);

  buffered.value = 0;
  vi.advanceTimersByTime(250);
  await client.settle();
  expect(client.all("quotes")).toEqual([
    { type: "quotes", quotes: [expect.objectContaining({ symbol: "AAPL", price: "120.00" })] },
  ]);
  vi.advanceTimersByTime(4_750);
  await client.settle();
  expect(client.all("heartbeat").at(-1)).toMatchObject({ skippedFrames: 20 });
});

test("a consumer stuck above 64 KB for 10 s is closed", async () => {
  shadowBufferedAmount({ value: 70_000 });
  vi.advanceTimersByTime(10_000);
  await client.settle();
  expect(client.socket.readyState).toBe(client.socket.OPEN);

  vi.advanceTimersByTime(250);
  await expect(client.closed).resolves.toBe(1013);
  await vi.waitFor(() => expect(gateway.feed.upstream()).toEqual([]));
});

test("a congested peer gets no other frames, and its subscribe answer waits until it drains", async () => {
  const buffered = { value: 70_000 };
  shadowBufferedAmount(buffered);
  const before = client.received.length;

  client.send({ type: "subscribe", requestId: 2, symbols: ["NVDA", "ZZZZ"] });
  client.socket.send("not json");
  gateway.feed.setStatus("closed");
  vi.advanceTimersByTime(5_000);
  await client.settle();

  expect(client.received.slice(before)).toEqual([]);

  buffered.value = 0;
  vi.advanceTimersByTime(250);
  await client.settle();
  expect(client.received.slice(before)).toMatchObject([
    { type: "error", code: "unknown_symbol", requestId: 2, symbols: ["ZZZZ"] },
    { type: "snapshot", requestId: 2, quotes: [{ symbol: "NVDA" }] },
  ]);
  await client.next("snapshot");
  client.send({ type: "subscribe", requestId: 3, symbols: ["SPY"] });
  await expect(client.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "SPY" }] });
});

test("a stuck peer that stops reading is terminated and frees its IP slot", async () => {
  const others = await Promise.all(Array.from({ length: 9 }, () => gateway.connect()));
  const rawSocket = (client.socket as unknown as { _socket: Socket })._socket;
  try {
    await expect(gateway.connect()).rejects.toThrow("429");
    shadowBufferedAmount({ value: 70_000 });
    rawSocket.pause();

    vi.advanceTimersByTime(10_250);
    await vi.waitFor(() => expect(gateway.feed.upstream()).toEqual([]));

    await vi.waitFor(
      async () => {
        const replacement = await gateway.connect();
        replacement.socket.close();
      },
      { timeout: 2_500, interval: 100 },
    );
  } finally {
    rawSocket.destroy();
    others.forEach((other) => other.socket.close());
  }
});

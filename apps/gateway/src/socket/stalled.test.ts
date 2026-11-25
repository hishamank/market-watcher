import { afterEach, expect, test, vi } from "vitest";
import { createFakeFeed } from "../hub/fake-feed.ts";
import { type Gateway, startGateway } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  vi.useRealTimers();
  await gateway?.close();
  gateway = undefined;
});

test("a start that never settles delays only its own symbol", async () => {
  const base = createFakeFeed();
  const starts: string[][] = [];
  const feed = {
    ...base,
    live: {
      ...base.live,
      subscribe(symbols: readonly string[]) {
        starts.push([...symbols]);
        if (symbols.includes("AAPL")) {
          return new Promise<never>(() => undefined) as unknown as void;
        }
        base.live.subscribe(symbols);
      },
    },
  };
  gateway = await startGateway(feed);
  const alice = await gateway.connect();
  const bob = await gateway.connect();
  const carol = await gateway.connect();
  const dave = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.settle();
  bob.send({ type: "subscribe", requestId: 2, symbols: ["AAPL", "MSFT"] });
  await bob.settle();
  carol.send({ type: "subscribe", requestId: 3, symbols: ["MSFT", "NVDA"] });
  dave.send({ type: "subscribe", requestId: 4, symbols: ["NVDA"] });

  const carolSnapshot = await carol.next("snapshot");
  expect(carolSnapshot.quotes.map((quote) => quote.symbol)).toEqual(["MSFT", "NVDA"]);
  await expect(dave.next("snapshot")).resolves.toMatchObject({ quotes: [{ symbol: "NVDA" }] });
  expect(starts).toEqual([["AAPL"], ["MSFT"], ["NVDA"]]);
  expect(base.upstream()).toEqual(["MSFT", "NVDA"]);

  base.tick("MSFT", "103.00");
  await expect(carol.next("quotes")).resolves.toMatchObject({ quotes: [{ symbol: "MSFT" }] });
  await alice.settle();
  expect(alice.all("snapshot")).toEqual([]);
  expect(bob.all("snapshot")).toEqual([]);
});

test("a start that never settles is answered unavailable at the reply deadline", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  const base = createFakeFeed();
  const feed = {
    ...base,
    live: {
      ...base.live,
      subscribe(symbols: readonly string[]) {
        if (symbols.includes("AAPL")) {
          return new Promise<never>(() => undefined) as unknown as void;
        }
        base.live.subscribe(symbols);
      },
      snapshot: async (symbols: readonly string[]) =>
        base.live.snapshot(symbols.filter((symbol) => symbol !== "AAPL")),
    },
  };
  gateway = await startGateway(feed);
  const alice = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] });
  await alice.settle();
  vi.advanceTimersByTime(4_999);
  await alice.settle();
  expect(alice.all("snapshot")).toEqual([]);

  vi.advanceTimersByTime(1);
  await expect(alice.next("snapshot")).resolves.toEqual({
    type: "snapshot",
    requestId: 1,
    quotes: [],
  });
  expect(alice.all("error")).toMatchObject([
    { code: "unavailable", requestId: 1, symbols: ["AAPL", "MSFT"] },
  ]);
});

test("a snapshot that never settles is read once while the deadline still answers", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  const base = createFakeFeed();
  const reads: string[][] = [];
  const feed = {
    ...base,
    live: {
      ...base.live,
      snapshot(symbols: readonly string[]) {
        reads.push([...symbols]);
        return new Promise<never>(() => undefined);
      },
    },
  };
  gateway = await startGateway(feed);
  const alice = await gateway.connect();

  alice.send({ type: "subscribe", requestId: 1, symbols: ["AAPL"] });
  await alice.settle();
  await vi.advanceTimersByTimeAsync(4_999);
  await alice.settle();
  expect(alice.all("snapshot")).toEqual([]);

  await vi.advanceTimersByTimeAsync(1);
  await expect(alice.next("snapshot")).resolves.toEqual({
    type: "snapshot",
    requestId: 1,
    quotes: [],
  });
  await vi.advanceTimersByTimeAsync(5_000);
  await alice.settle();
  expect(reads).toEqual([["AAPL"]]);
});

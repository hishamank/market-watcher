import type { ServerMessage } from "@mini/contracts";
import { afterEach, expect, test, vi } from "vitest";
import { FAKE_SYMBOLS } from "../hub/fake-feed.ts";
import { createHeldFeed, type HeldCall, type HeldFeed } from "./held-feed.ts";
import { type Gateway, startGateway, type TestClient } from "./testing.ts";

let gateway: Gateway | undefined;

afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

const POOL = [...FAKE_SYMBOLS, "ZZZZ"];
const DRAIN = { timeout: 4_000 };

interface Actor {
  readonly client: TestClient;
  readonly requests: Map<number, string[]>;
  readonly held: Set<string>;
}

interface World {
  readonly feed: HeldFeed;
  readonly done: Set<HeldCall>;
  readonly snapshots: { failing: boolean };
  nextId: number;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<Item>(random: () => number, items: readonly Item[]): Item {
  return items[Math.floor(random() * items.length)]!;
}

function someSymbols(random: () => number): string[] {
  const count = 1 + Math.floor(random() * 3);
  return Array.from({ length: count }, () => pick(random, POOL));
}

function symbolsAnswered(messages: readonly ServerMessage[], requestId: number): string[] {
  return messages.flatMap((message) => {
    if (message.type === "error" && "symbols" in message && message.requestId === requestId) {
      return message.symbols;
    }
    if (message.type === "snapshot" && message.requestId === requestId) {
      return message.quotes.map((quote) => quote.symbol);
    }
    return [];
  });
}

async function step(random: () => number, actors: Actor[], world: World) {
  const actor = pick(random, actors);
  const roll = random();
  const open = world.feed.calls.filter((call) => !world.done.has(call));
  if (roll < 0.05) {
    world.snapshots.failing = !world.snapshots.failing;
  } else if (roll < 0.4 || (roll >= 0.65 && open.length === 0)) {
    const symbols = someSymbols(random);
    const requestId = world.nextId;
    world.nextId += 1 + Math.floor(random() * 5);
    actor.requests.set(requestId, symbols);
    symbols.filter((symbol) => FAKE_SYMBOLS.includes(symbol)).forEach((s) => actor.held.add(s));
    actor.client.send({ type: "subscribe", requestId, symbols });
  } else if (roll < 0.65) {
    const symbols = someSymbols(random);
    symbols.forEach((symbol) => actor.held.delete(symbol));
    actor.client.send({ type: "unsubscribe", symbols });
  } else {
    const call = pick(random, open);
    world.done.add(call);
    if (random() < 0.5) {
      call.resolve();
    } else {
      call.reject();
    }
  }
  await actor.client.settle();
}

function expectEveryRequestAnswered(actor: Actor): void {
  const messages = actor.client.received;
  const snapshotIds = actor.client.all("snapshot").map((snapshot) => snapshot.requestId);
  expect(snapshotIds).toEqual([...actor.requests.keys()]);
  for (const [requestId, symbols] of actor.requests) {
    expect(symbolsAnswered(messages, requestId).sort()).toEqual([...new Set(symbols)].sort());
    const terminal = messages.findIndex(
      (message) => message.type === "snapshot" && message.requestId === requestId,
    );
    const late = messages.slice(terminal).filter((message) => message.type === "error");
    expect(late.some((error) => "requestId" in error && error.requestId === requestId)).toBe(false);
  }
  const codes = new Set(actor.client.all("error").map((error) => error.code));
  expect([...codes].every((code) => code === "unknown_symbol" || code === "unavailable")).toBe(
    true,
  );
}

function failingSnapshots(feed: HeldFeed): World["snapshots"] {
  const snapshots = { failing: false };
  const snapshot = feed.live.snapshot;
  feed.live.snapshot = async (symbols) => {
    if (snapshots.failing) {
      throw new Error("snapshot failed");
    }
    return snapshot(symbols);
  };
  return snapshots;
}

test.each([1, 2, 3, 4, 5, 6, 7, 8])(
  "every subscribe is answered once under its ID, one entry per symbol (seed %i)",
  async (seed) => {
    const random = seeded(seed);
    const feed = createHeldFeed();
    const world: World = { feed, done: new Set(), snapshots: failingSnapshots(feed), nextId: 1 };
    gateway = await startGateway(feed);
    const actors: Actor[] = [];
    for (let index = 0; index < 4; index += 1) {
      actors.push({ client: await gateway.connect(), requests: new Map(), held: new Set() });
    }
    for (let index = 0; index < 40; index += 1) {
      await step(random, actors, world);
    }

    feed.passThrough();
    for (const actor of actors) {
      await vi.waitFor(
        () => expect(actor.client.all("snapshot")).toHaveLength(actor.requests.size),
        DRAIN,
      );
      expectEveryRequestAnswered(actor);
    }
    const wanted = [...new Set(actors.flatMap((actor) => [...actor.held]))].sort();
    await vi.waitFor(() => expect(feed.upstream()).toEqual(wanted), DRAIN);
  },
  15_000,
);

test("an unsubscribe sent while its subscribe is pending is applied after the answer", async () => {
  const feed = createHeldFeed();
  gateway = await startGateway(feed);
  const alice = await gateway.connect();
  const bob = await gateway.connect();
  feed.passThrough();
  bob.send({ type: "subscribe", requestId: 2, symbols: ["AAPL"] });
  await bob.next("snapshot");

  feed.holdCalls();
  const before = feed.calls.length;
  alice.send({ type: "subscribe", requestId: 3, symbols: ["AAPL", "MSFT"] });
  alice.send({ type: "unsubscribe", symbols: ["AAPL", "MSFT"] });
  await alice.settle();
  expect(alice.all("snapshot")).toEqual([]);
  feed.calls[before]!.resolve();

  const snapshot = await alice.next("snapshot");
  expect(snapshot.quotes.map((quote) => quote.symbol)).toEqual(["AAPL", "MSFT"]);
  feed.passThrough();
  await vi.waitFor(() => expect(feed.upstream()).toEqual(["AAPL"]));
  expect(alice.all("error")).toEqual([]);
});

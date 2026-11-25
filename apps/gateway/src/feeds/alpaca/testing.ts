import { readFileSync } from "node:fs";
import type { AlpacaConfig } from "./config.ts";
import type { Fetch } from "./http.ts";
import { type AlpacaDependencies, type AlpacaFeed, createAlpacaFeed } from "./index.ts";
import type { OpenSocket, SocketHandlers } from "./stream.ts";

export const SESSION_NOW = Date.parse("2025-06-24T18:15:30Z");
export const AFTER_HOURS_NOW = Date.parse("2025-06-24T22:00:00Z");

export const TEST_CONFIG: AlpacaConfig = {
  keyId: "test-key-id",
  secretKey: "test-secret-key",
  tradingUrl: "https://paper-api.test",
  dataUrl: "https://data.test",
  streamUrl: "wss://stream.test/v2/iex",
};

export function fixture(name: string): string {
  return readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8");
}

export interface FakeAlpaca {
  readonly fetch: Fetch;
  readonly requests: { url: URL; signal: AbortSignal | undefined }[];
  readonly failing: Map<string, number>;
  readonly omitted: Set<string>;
  readonly routes: Map<string, (url: URL) => string>;
  clock: "open" | "after-hours";
  assets: string;
  calls(path: string): URL[];
}

function snapshotsFor(symbols: readonly string[], omitted: ReadonlySet<string>): string {
  const recorded = JSON.parse(fixture("snapshots.json")) as Record<string, unknown>;
  const body = Object.fromEntries(
    symbols
      .filter((symbol) => !omitted.has(symbol))
      .map((symbol) => [symbol, recorded[symbol] ?? recorded["AAPL"]]),
  );
  return JSON.stringify(body);
}

function respond(alpaca: FakeAlpaca, url: URL): string {
  const params = url.searchParams;
  switch (url.pathname) {
    case "/v2/clock":
      return fixture(`clock-${alpaca.clock}.json`);
    case "/v2/calendar":
      return fixture("calendar.json");
    case "/v2/assets":
      return alpaca.assets;
    case "/v2/stocks/snapshots":
      return snapshotsFor((params.get("symbols") ?? "").split(","), alpaca.omitted);
    case "/v2/stocks/bars":
      if (params.get("timeframe") === "5Min") {
        return fixture(
          params.has("page_token") ? "bars-5min-page-2.json" : "bars-5min-page-1.json",
        );
      }
      return fixture("bars-1day.json");
    default:
      throw new Error(`unexpected Alpaca call ${url.pathname}`);
  }
}

export function createFakeAlpaca(): FakeAlpaca {
  const alpaca: FakeAlpaca = {
    requests: [],
    failing: new Map(),
    omitted: new Set(),
    routes: new Map(),
    clock: "open",
    assets: fixture("assets.json"),
    calls: (path) =>
      alpaca.requests.filter(({ url }) => url.pathname === path).map(({ url }) => url),
    fetch: async (raw, init) => {
      const url = new URL(raw);
      const signal = init.signal ?? undefined;
      alpaca.requests.push({ url, signal });
      if (signal?.aborted) {
        throw signal.reason;
      }
      const status = alpaca.failing.get(url.pathname) ?? alpaca.failing.get("*");
      if (status !== undefined) {
        return new Response("{}", { status });
      }
      const route = alpaca.routes.get(url.pathname);
      return new Response(route ? route(url) : respond(alpaca, url), { status: 200 });
    },
  };
  return alpaca;
}

export function assetsFor(symbols: readonly string[]): string {
  const [apple] = JSON.parse(fixture("assets.json")) as Record<string, unknown>[];
  return JSON.stringify(symbols.map((symbol) => ({ ...apple, symbol, name: `${symbol} Inc.` })));
}

export interface FakeSocket {
  readonly url: string;
  readonly sent: Record<string, unknown>[];
  closed: boolean;
  push(name: string): void;
  drop(): void;
  trades(): string[];
}

export interface FakeSockets {
  readonly open: OpenSocket;
  readonly all: FakeSocket[];
  last(): FakeSocket;
}

function fakeSocket(url: string, handlers: SocketHandlers): FakeSocket {
  const socket: FakeSocket = {
    url,
    sent: [],
    closed: false,
    push: (name) => handlers.message(fixture(name)),
    drop() {
      socket.closed = true;
      handlers.close();
    },
    trades() {
      const held = new Set<string>();
      for (const message of socket.sent) {
        const symbols = (message["trades"] ?? []) as string[];
        if (message["action"] === "subscribe") symbols.forEach((symbol) => held.add(symbol));
        if (message["action"] === "unsubscribe") symbols.forEach((symbol) => held.delete(symbol));
      }
      return [...held].sort();
    },
  };
  return socket;
}

export function createFakeSockets(): FakeSockets {
  const all: FakeSocket[] = [];
  return {
    all,
    open(url, handlers) {
      const socket = fakeSocket(url, handlers);
      all.push(socket);
      return {
        send: (data) => void socket.sent.push(JSON.parse(data) as Record<string, unknown>),
        close: () => void (socket.closed = true),
      };
    },
    last() {
      const socket = all.at(-1);
      if (socket === undefined) throw new Error("no stream socket was opened");
      return socket;
    },
  };
}

export function authenticate(socket: FakeSocket): void {
  socket.push("stream-connected.json");
  socket.push("stream-authenticated.json");
}

export interface AlpacaRig {
  readonly now: () => number;
  readonly feed: AlpacaFeed;
  readonly alpaca: FakeAlpaca;
  readonly sockets: FakeSockets;
  readonly warnings: string[];
}

export async function startAlpaca(
  setup: (alpaca: FakeAlpaca) => void = () => undefined,
  deps: AlpacaDependencies = {},
): Promise<AlpacaRig> {
  const alpaca = createFakeAlpaca();
  setup(alpaca);
  const sockets = createFakeSockets();
  const warnings: string[] = [];
  const now = deps.now ?? (() => SESSION_NOW);
  const feed = await createAlpacaFeed(TEST_CONFIG, {
    fetch: alpaca.fetch,
    openSocket: sockets.open,
    now,
    random: () => 1,
    warn: (_detail, message) => void warnings.push(message),
    ...deps,
  });
  return { feed, alpaca, sockets, warnings, now };
}

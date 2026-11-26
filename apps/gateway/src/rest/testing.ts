import type { AddressInfo } from "node:net";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { buildApp } from "../app.ts";
import { createSimulatorFeed, type SimulatorFeed } from "../feeds/simulator/index.ts";
import type {
  Feed,
  HistoryRequest,
  HistorySeries,
  HistorySource,
  LiveFeed,
} from "../feeds/types.ts";
import type { RestRateLimitOptions } from "./plugins.ts";

export const TEST_ORIGIN = "http://localhost:3000";
export const FIXED_NOW = Date.UTC(2026, 10, 25, 14, 23, 17, 0);
export const TEST_SEED = "rest-seam-seed";

export interface RestGatewayOptions {
  seed?: string;
  initialNow?: number;
  allowedOrigins?: ReadonlySet<string>;
  trustProxy?: FastifyServerOptions["trustProxy"];
  historyFallbacks?: readonly HistorySource[];
  historyCacheMaxEntries?: number;
  historySourceTimeoutMs?: number;
  rateLimit?: RestRateLimitOptions;
  wrapHistory?: (base: HistorySource) => HistorySource;
  wrapLive?: (base: LiveFeed) => LiveFeed;
}

export interface RestGateway {
  readonly app: FastifyInstance;
  readonly feed: SimulatorFeed;
  readonly baseUrl: string;
  readonly historyCalls: HistoryRequest[];
  now(): number;
  advanceMs(deltaMs: number): void;
  setNow(nextNow: number): void;
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  options(path: string, headers?: Record<string, string>): Promise<Response>;
  close(): Promise<void>;
}

export async function startRestGateway(options: RestGatewayOptions = {}): Promise<RestGateway> {
  let currentNow = options.initialNow ?? FIXED_NOW;
  const clock = () => currentNow;
  const feed = createSimulatorFeed({
    seed: options.seed ?? TEST_SEED,
    clock,
  });
  const historyCalls: HistoryRequest[] = [];
  const baseHistory = options.wrapHistory ? options.wrapHistory(feed.history) : feed.history;
  const spiedHistory: HistorySource = {
    history(request: HistoryRequest): Promise<HistorySeries> {
      historyCalls.push(request);
      return baseHistory.history(request);
    },
  };
  const wiredFeed: Feed = {
    live: options.wrapLive ? options.wrapLive(feed.live) : feed.live,
    history: spiedHistory,
    catalogue: feed.catalogue,
    calendar: feed.calendar,
  };
  const app = buildApp({
    feed: wiredFeed,
    feedMode: "simulated",
    allowedOrigins: options.allowedOrigins ?? new Set([TEST_ORIGIN]),
    now: clock,
    logger: false,
    ...(options.trustProxy !== undefined ? { trustProxy: options.trustProxy } : {}),
    ...(options.historyFallbacks !== undefined
      ? { historyFallbacks: options.historyFallbacks }
      : {}),
    ...(options.historyCacheMaxEntries !== undefined
      ? { historyCacheMaxEntries: options.historyCacheMaxEntries }
      : {}),
    ...(options.historySourceTimeoutMs !== undefined
      ? { historySourceTimeoutMs: options.historySourceTimeoutMs }
      : {}),
    ...(options.rateLimit !== undefined ? { rateLimit: options.rateLimit } : {}),
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    feed,
    baseUrl,
    historyCalls,
    now: clock,
    advanceMs: (deltaMs) => {
      currentNow += deltaMs;
    },
    setNow: (nextNow) => {
      currentNow = nextNow;
    },
    get: (path, headers) =>
      fetch(`${baseUrl}${path}`, {
        method: "GET",
        ...(headers !== undefined ? { headers } : {}),
      }),
    options: (path, headers) =>
      fetch(`${baseUrl}${path}`, {
        method: "OPTIONS",
        ...(headers !== undefined ? { headers } : {}),
      }),
    async close() {
      feed.close();
      await app.close();
    },
  };
}

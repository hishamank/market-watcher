import {
  StockStatisticsResponseSchema,
  StockSymbolParamsSchema,
  type StockStatisticsResponse,
  type FeedMode,
} from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import type { Catalogue } from "../feeds/types.ts";
import { RestError } from "../rest/errors.ts";
import type { StatisticsSource } from "./source.ts";
import { simulatorStatisticsSource } from "./simulator.ts";
import { createYahooStatisticsSource } from "./yahoo.ts";

interface StatisticsRouteOptions {
  catalogue: Catalogue;
  feedMode: FeedMode;
  now: () => number;
  statisticsSource?: StatisticsSource;
  statisticsTimeoutMs?: number;
}

export async function statisticsRoute(app: FastifyInstance, options: StatisticsRouteOptions) {
  const simulated = options.feedMode === "simulated";
  const source = simulated
    ? simulatorStatisticsSource
    : (options.statisticsSource ?? createYahooStatisticsSource());
  const cache = new Map<string, { data: StockStatisticsResponse; expires: number }>();
  const pending = new Map<string, Promise<StockStatisticsResponse>>();
  const controllers = new Set<AbortController>();
  app.addHook("onClose", async () => {
    for (const controller of controllers) controller.abort();
    cache.clear();
  });

  async function load(symbol: string): Promise<StockStatisticsResponse> {
    const controller = new AbortController();
    controllers.add(controller);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Statistics deadline"));
        }, options.statisticsTimeoutMs ?? 8_000);
      });
      const statistics = await Promise.race([source.load(symbol, controller.signal), deadline]);
      const data = StockStatisticsResponseSchema.parse({
        symbol,
        source: simulated ? "simulated" : "yahoo",
        fetchedAt: options.now(),
        statistics,
      });
      if (cache.size >= 500) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(symbol, { data, expires: options.now() + (statistics ? 3_600_000 : 300_000) });
      return data;
    } catch {
      throw new RestError(503, "unavailable", "Statistics are unavailable");
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
      pending.delete(symbol);
    }
  }

  app.get("/stocks/:symbol/statistics", async (request) => {
    const params = StockSymbolParamsSchema.safeParse(request.params);
    if (!params.success) throw new RestError(400, "invalid_request", "Invalid symbol parameter");
    const { symbol } = params.data;
    if (!options.catalogue.get(symbol)) throw new RestError(404, "not_found", "Symbol not found");
    const cached = cache.get(symbol);
    if (cached && cached.expires > options.now()) return cached.data;
    const active = pending.get(symbol);
    if (active) return active;
    if (pending.size >= 8) throw new RestError(503, "unavailable", "Statistics source is busy");
    const task = Promise.resolve().then(() => load(symbol));
    pending.set(symbol, task);
    return task;
  });
}

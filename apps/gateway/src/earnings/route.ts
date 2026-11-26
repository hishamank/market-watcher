import {
  StockEarningsResponseSchema,
  StockSymbolParamsSchema,
  type StockEarningsResponse,
  type FeedMode,
} from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import type { Catalogue } from "../feeds/types.ts";
import { RestError } from "../rest/errors.ts";
import type { EarningsSource } from "./source.ts";
import { simulatorEarningsSource } from "./simulator.ts";
import { createYahooEarningsSource } from "./yahoo.ts";

interface EarningsRouteOptions {
  catalogue: Catalogue;
  feedMode: FeedMode;
  now: () => number;
  earningsSource?: EarningsSource;
  earningsTimeoutMs?: number;
}

export async function earningsRoute(app: FastifyInstance, options: EarningsRouteOptions) {
  const simulated = options.feedMode === "simulated";
  const source = simulated
    ? simulatorEarningsSource
    : (options.earningsSource ?? createYahooEarningsSource(options.now));
  const cache = new Map<string, { data: StockEarningsResponse; expires: number }>();
  const pending = new Map<string, Promise<StockEarningsResponse>>();
  const controllers = new Set<AbortController>();
  app.addHook("onClose", async () => {
    for (const controller of controllers) controller.abort();
    cache.clear();
  });

  async function load(symbol: string): Promise<StockEarningsResponse> {
    const controller = new AbortController();
    controllers.add(controller);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Earnings deadline"));
        }, options.earningsTimeoutMs ?? 8_000);
      });
      const earnings = await Promise.race([source.load(symbol, controller.signal), deadline]);
      const data = StockEarningsResponseSchema.parse({
        symbol,
        source: simulated ? "simulated" : "yahoo",
        fetchedAt: options.now(),
        earnings,
      });
      if (cache.size >= 500) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(symbol, { data, expires: options.now() + (earnings ? 3_600_000 : 300_000) });
      return data;
    } catch {
      throw new RestError(503, "unavailable", "Earnings are unavailable");
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
      pending.delete(symbol);
    }
  }

  app.get("/stocks/:symbol/earnings", async (request) => {
    const params = StockSymbolParamsSchema.safeParse(request.params);
    if (!params.success) throw new RestError(400, "invalid_request", "Invalid symbol parameter");
    const { symbol } = params.data;
    if (!options.catalogue.get(symbol)) throw new RestError(404, "not_found", "Symbol not found");
    const cached = cache.get(symbol);
    if (cached && cached.expires > options.now()) return cached.data;
    const active = pending.get(symbol);
    if (active) return active;
    if (pending.size >= 8) throw new RestError(503, "unavailable", "Earnings source is busy");
    const task = Promise.resolve().then(() => load(symbol));
    pending.set(symbol, task);
    return task;
  });
}

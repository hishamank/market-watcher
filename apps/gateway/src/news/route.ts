import {
  StockNewsResponseSchema,
  StockSymbolParamsSchema,
  type StockNewsResponse,
  type FeedMode,
} from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import type { Catalogue } from "../feeds/types.ts";
import { RestError } from "../rest/errors.ts";
import type { NewsSource } from "./source.ts";
import { simulatorNewsSource } from "./simulator.ts";
import { createYahooNewsSource } from "./yahoo.ts";

interface NewsRouteOptions {
  catalogue: Catalogue;
  feedMode: FeedMode;
  now: () => number;
  newsSource?: NewsSource;
  newsTimeoutMs?: number;
}

export async function newsRoute(app: FastifyInstance, options: NewsRouteOptions) {
  const simulated = options.feedMode === "simulated";
  const source = simulated ? simulatorNewsSource : (options.newsSource ?? createYahooNewsSource());
  const cache = new Map<string, { data: StockNewsResponse; expires: number }>();
  const pending = new Map<string, Promise<StockNewsResponse>>();
  const controllers = new Set<AbortController>();
  app.addHook("onClose", async () => {
    for (const controller of controllers) controller.abort();
    cache.clear();
  });

  async function load(symbol: string): Promise<StockNewsResponse> {
    const controller = new AbortController();
    controllers.add(controller);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("News deadline"));
        }, options.newsTimeoutMs ?? 8_000);
      });
      const articles = await Promise.race([source.load(symbol, controller.signal), deadline]);
      const data = StockNewsResponseSchema.parse({
        symbol,
        source: simulated ? "simulated" : "yahoo",
        fetchedAt: options.now(),
        articles,
      });
      if (cache.size >= 500) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(symbol, { data, expires: options.now() + 600_000 });
      return data;
    } catch {
      throw new RestError(503, "unavailable", "News is unavailable");
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
      pending.delete(symbol);
    }
  }

  app.get("/stocks/:symbol/news", async (request) => {
    const params = StockSymbolParamsSchema.safeParse(request.params);
    if (!params.success) throw new RestError(400, "invalid_request", "Invalid symbol parameter");
    const { symbol } = params.data;
    if (!options.catalogue.get(symbol)) throw new RestError(404, "not_found", "Symbol not found");
    const cached = cache.get(symbol);
    if (cached && cached.expires > options.now()) return cached.data;
    const active = pending.get(symbol);
    if (active) return active;
    if (pending.size >= 8) throw new RestError(503, "unavailable", "News source is busy");
    const task = Promise.resolve().then(() => load(symbol));
    pending.set(symbol, task);
    return task;
  });
}

import {
  CompanyProfileResponseSchema,
  StockSymbolParamsSchema,
  type CompanyProfileResponse,
  type FeedMode,
} from "@mini/contracts";
import type { FastifyInstance } from "fastify";
import type { Catalogue } from "../feeds/types.ts";
import { RestError } from "../rest/errors.ts";
import type { ProfileSource } from "./source.ts";
import { simulatorProfileSource } from "./simulator.ts";
import { createYahooProfileSource } from "./yahoo.ts";

interface ProfileRouteOptions {
  catalogue: Catalogue;
  feedMode: FeedMode;
  now: () => number;
  profileSource?: ProfileSource;
  profileTimeoutMs?: number;
}

export async function profileRoute(app: FastifyInstance, options: ProfileRouteOptions) {
  const simulated = options.feedMode === "simulated";
  const source = simulated
    ? simulatorProfileSource
    : (options.profileSource ?? createYahooProfileSource());
  const cache = new Map<string, { data: CompanyProfileResponse; expires: number }>();
  const pending = new Map<string, Promise<CompanyProfileResponse>>();
  const controllers = new Set<AbortController>();
  app.addHook("onClose", async () => {
    for (const controller of controllers) controller.abort();
    cache.clear();
  });

  async function load(symbol: string): Promise<CompanyProfileResponse> {
    const controller = new AbortController();
    controllers.add(controller);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Profile deadline"));
        }, options.profileTimeoutMs ?? 8_000);
      });
      const profile = await Promise.race([source.load(symbol, controller.signal), deadline]);
      const data = CompanyProfileResponseSchema.parse({
        symbol,
        source: simulated ? "simulated" : "yahoo",
        fetchedAt: options.now(),
        profile,
      });
      if (cache.size >= 500) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(symbol, { data, expires: options.now() + (profile ? 86_400_000 : 300_000) });
      return data;
    } catch {
      throw new RestError(503, "unavailable", "Company information is unavailable");
    } finally {
      clearTimeout(timeout);
      controllers.delete(controller);
      pending.delete(symbol);
    }
  }

  app.get("/stocks/:symbol/profile", async (request) => {
    const params = StockSymbolParamsSchema.safeParse(request.params);
    if (!params.success) throw new RestError(400, "invalid_request", "Invalid symbol parameter");
    const { symbol } = params.data;
    if (!options.catalogue.get(symbol)) throw new RestError(404, "not_found", "Symbol not found");
    const cached = cache.get(symbol);
    if (cached && cached.expires > options.now()) return cached.data;
    const active = pending.get(symbol);
    if (active) return active;
    if (pending.size >= 8) throw new RestError(503, "unavailable", "Company information is busy");
    const task = Promise.resolve().then(() => load(symbol));
    pending.set(symbol, task);
    return task;
  });
}

import { type HealthResponse, HealthResponseSchema } from "@mini/contracts";
import { UNKNOWN_REVISION } from "../revision.ts";
import type { HistoryCacheStats } from "./history-cache.ts";

export interface ConnectionStats {
  connections: number;
  upstreamSymbols: number;
}

export function healthResponse(
  connections: ConnectionStats,
  cache: HistoryCacheStats,
  revision?: string,
): HealthResponse {
  const lookups = cache.hits + cache.misses;
  return HealthResponseSchema.parse({
    connections: connections.connections,
    upstreamSymbols: connections.upstreamSymbols,
    historyCacheHitRate: lookups === 0 ? 0 : cache.hits / lookups,
    ...(revision !== undefined && revision !== UNKNOWN_REVISION ? { revision } : {}),
  });
}

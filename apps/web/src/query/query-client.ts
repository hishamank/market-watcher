import { QueryClient } from "@tanstack/react-query";

const SERVER_HANDOFF_STALE_MS = 60_000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: SERVER_HANDOFF_STALE_MS } },
  });
}

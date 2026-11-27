import { dehydrate, type QueryClient } from "@tanstack/react-query";
import { FeedHydrationBoundary } from "./feed-hydration-boundary.tsx";
import type { ReactNode } from "react";
import { getServerQueryClient } from "./server-query-client.ts";

export interface PrefetchBoundaryProps {
  prefetch?: (client: QueryClient) => Promise<unknown>;
  children: ReactNode;
}

export async function PrefetchBoundary({ prefetch, children }: PrefetchBoundaryProps) {
  const client = getServerQueryClient();
  await prefetch?.(client);
  return <FeedHydrationBoundary state={dehydrate(client)}>{children}</FeedHydrationBoundary>;
}

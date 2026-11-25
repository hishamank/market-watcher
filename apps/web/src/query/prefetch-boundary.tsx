import { dehydrate, HydrationBoundary, type QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getServerQueryClient } from "./server-query-client.ts";

export interface PrefetchBoundaryProps {
  prefetch?: (client: QueryClient) => Promise<unknown>;
  children: ReactNode;
}

export async function PrefetchBoundary({ prefetch, children }: PrefetchBoundaryProps) {
  const client = getServerQueryClient();
  await prefetch?.(client);
  return <HydrationBoundary state={dehydrate(client)}>{children}</HydrationBoundary>;
}

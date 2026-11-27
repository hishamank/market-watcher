import { createRestClient, stockPagesQueryOptions } from "@mini/core";
import { cache } from "react";
import { getServerQueryClient } from "../query/server-query-client.ts";

export const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

const rest = createRestClient({
  gatewayUrl,
  fetch: (url, init) =>
    fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(2_000) }),
});

export const readInitialStocks = cache(async () => {
  const data = await getServerQueryClient().fetchInfiniteQuery(stockPagesQueryOptions(rest));
  const page = data.pages[0];
  if (!page) throw new Error("Initial stock page is unavailable");
  return page;
});

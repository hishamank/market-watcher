import { createRestClient, stockListQueryOptions, stockPagesQueryOptions } from "@mini/core";
import type { QueryClient } from "@tanstack/react-query";
import { gatewayUrl } from "../gateway/shell-meta.ts";
import { ListPage } from "../list/list-page.tsx";
import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

const rest = createRestClient({ gatewayUrl });

function prefetchViews(client: QueryClient) {
  return Promise.all([
    client.prefetchQuery(stockListQueryOptions(rest)),
    client.prefetchInfiniteQuery(stockPagesQueryOptions(rest)),
  ]);
}

export default function HomePage() {
  return (
    <PrefetchBoundary prefetch={prefetchViews}>
      <ListPage />
    </PrefetchBoundary>
  );
}

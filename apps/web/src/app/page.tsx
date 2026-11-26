import { createRestClient, stockListQueryOptions } from "@mini/core";
import { gatewayUrl } from "../gateway/shell-meta.ts";
import { ListPage } from "../list/list-page.tsx";
import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

const rest = createRestClient({ gatewayUrl });

export default function HomePage() {
  return (
    <PrefetchBoundary prefetch={(client) => client.prefetchQuery(stockListQueryOptions(rest))}>
      <ListPage />
    </PrefetchBoundary>
  );
}

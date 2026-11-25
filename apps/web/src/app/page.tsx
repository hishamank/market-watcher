import { createRestClient, stockListQueryOptions } from "@mini/core";
import { gatewayUrl } from "../gateway/shell-meta.ts";
import { ListPage } from "../list/list-page.tsx";
import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

const rest = createRestClient({ gatewayUrl });

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { view } = await searchParams;
  return (
    <PrefetchBoundary prefetch={(client) => client.prefetchQuery(stockListQueryOptions(rest))}>
      <ListPage view={view === "watchlist" ? "watchlist" : "all"} />
    </PrefetchBoundary>
  );
}

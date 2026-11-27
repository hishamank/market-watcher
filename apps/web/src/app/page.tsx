import { pageMetadata, readMetadataLocale } from "../metadata/page-metadata.ts";
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

export async function generateMetadata() {
  const { t } = await readMetadataLocale();
  return pageMetadata(t("header.title"), t("seo.homeDescription"), "/");
}

export default function HomePage() {
  return (
    <PrefetchBoundary prefetch={prefetchViews}>
      <ListPage />
    </PrefetchBoundary>
  );
}

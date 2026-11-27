import { pageMetadata, readMetadataLocale } from "../metadata/page-metadata.ts";
import { createRestClient, stockPagesQueryOptions, stockQueryKeys } from "@mini/core";
import type { QueryClient } from "@tanstack/react-query";
import { gatewayUrl, readInitialStocks } from "../gateway/initial-stocks.ts";
import { ListPage } from "../list/list-page.tsx";
import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

const rest = createRestClient({ gatewayUrl });

async function prefetchList(client: QueryClient) {
  try {
    client.setQueryData(stockQueryKeys.list(), await readInitialStocks());
  } catch {
    return;
  }
}

async function prefetchViews(client: QueryClient) {
  await Promise.all([
    prefetchList(client),
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

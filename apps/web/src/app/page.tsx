import { pageMetadata, readMetadataLocale } from "../metadata/page-metadata.ts";
import { stockQueryKeys } from "@mini/core";
import type { QueryClient } from "@tanstack/react-query";
import { readInitialStocks } from "../gateway/initial-stocks.ts";
import { ListPage } from "../list/list-page.tsx";
import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

async function prefetchViews(client: QueryClient) {
  try {
    const page = await readInitialStocks();
    client.setQueryData(stockQueryKeys.list(), page);
    client.setQueryData(stockQueryKeys.pages(), { pages: [page], pageParams: [undefined] });
  } catch {
    return;
  }
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

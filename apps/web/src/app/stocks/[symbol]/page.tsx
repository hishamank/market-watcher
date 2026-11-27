import { pageMetadata, readMetadataLocale } from "../../../metadata/page-metadata.ts";
import { readStock } from "../../../metadata/stock.ts";
import { createRestClient, historyQueryOptions, RestClientError } from "@mini/core";
import type { QueryClient } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { DetailPage } from "../../../detail/detail-page.tsx";
import { parseRange } from "../../../detail/parse-range.ts";
import { gatewayUrl } from "../../../gateway/shell-meta.ts";
import { PrefetchBoundary } from "../../../query/prefetch-boundary.tsx";

const rest = createRestClient({ gatewayUrl });

async function prefetchDetail(
  client: QueryClient,
  symbol: string,
  range: string | string[] | undefined,
) {
  const [stock] = await Promise.allSettled([
    readStock(symbol),
    client.prefetchQuery(historyQueryOptions(rest, symbol, parseRange(range))),
  ]);
  if (
    stock.status === "rejected" &&
    stock.reason instanceof RestClientError &&
    stock.reason.code === "not_found"
  ) {
    notFound();
  }
}

export async function generateMetadata({ params }: PageProps<"/stocks/[symbol]">) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const { t } = await readMetadataLocale();
  try {
    const { stock } = await readStock(upper);
    const values = { symbol: stock.symbol, name: stock.name };
    return pageMetadata(
      t("seo.stockTitle", values),
      t("seo.stockDescription", values),
      `/stocks/${encodeURIComponent(stock.symbol)}`,
    );
  } catch (error) {
    if (error instanceof RestClientError && error.code === "not_found") notFound();
    return {
      ...(await pageMetadata(
        t("seo.fallbackTitle", { symbol: upper }),
        t("seo.homeDescription"),
        `/stocks/${encodeURIComponent(upper)}`,
      )),
      robots: { index: false, follow: true },
    };
  }
}

export default async function StockPage({ params, searchParams }: PageProps<"/stocks/[symbol]">) {
  const [{ symbol }, { range }] = await Promise.all([params, searchParams]);
  const upper = symbol.toUpperCase();
  return (
    <PrefetchBoundary prefetch={(client) => prefetchDetail(client, upper, range)}>
      <DetailPage symbol={upper} />
    </PrefetchBoundary>
  );
}

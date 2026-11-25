import {
  createRestClient,
  historyQueryOptions,
  RestClientError,
  stockQueryOptions,
} from "@mini/core";
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
    client.fetchQuery(stockQueryOptions(rest, symbol)),
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

export default async function StockPage({ params, searchParams }: PageProps<"/stocks/[symbol]">) {
  const [{ symbol }, { range }] = await Promise.all([params, searchParams]);
  const upper = decodeURIComponent(symbol).toUpperCase();
  return (
    <PrefetchBoundary prefetch={(client) => prefetchDetail(client, upper, range)}>
      <DetailPage symbol={upper} />
    </PrefetchBoundary>
  );
}

"use client";

import type { Stock, StockPageResponse } from "@mini/contracts";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCore } from "../core-provider.tsx";
import { stockPagesQueryOptions } from "../rest/stock-queries.ts";

export interface StockPagesResult {
  readonly stocks: readonly Stock[] | undefined;
  readonly isError: boolean;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly loadMoreFailed: boolean;
  readonly loadMore: () => void;
  readonly retry: () => void;
}

const stocksCache = new WeakMap<InfiniteData<StockPageResponse>, readonly Stock[]>();

function uniqueStocks(data: InfiniteData<StockPageResponse>): readonly Stock[] {
  const cached = stocksCache.get(data);
  if (cached !== undefined) return cached;
  const bySymbol = new Map<string, Stock>();
  for (const page of data.pages) {
    for (const stock of page.stocks) {
      if (!bySymbol.has(stock.symbol)) bySymbol.set(stock.symbol, stock);
    }
  }
  const stocks = [...bySymbol.values()];
  stocksCache.set(data, stocks);
  return stocks;
}

export function useStockPages(): StockPagesResult {
  const { restClient, quoteStore } = useCore();
  const query = useInfiniteQuery(stockPagesQueryOptions(restClient, quoteStore));
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage, refetch } = query;
  const canLoadMore = hasNextPage && !isFetching && !isFetchNextPageError;

  const loadMore = useCallback(() => {
    if (canLoadMore) void fetchNextPage();
  }, [canLoadMore, fetchNextPage]);

  const retry = useCallback(() => {
    if (isFetching) return;
    if (isFetchNextPageError) void fetchNextPage();
    else void refetch();
  }, [isFetching, isFetchNextPageError, fetchNextPage, refetch]);

  return {
    stocks: query.data === undefined ? undefined : uniqueStocks(query.data),
    isError: query.isError && query.data === undefined,
    hasMore: hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreFailed: isFetchNextPageError,
    loadMore,
    retry,
  };
}

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

export interface StockPagesQueryState {
  readonly data: InfiniteData<StockPageResponse> | undefined;
  readonly isError: boolean;
  readonly hasNextPage: boolean;
  readonly isFetching: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isFetchNextPageError: boolean;
}

export interface StockPagesStatus {
  readonly stocks: readonly Stock[] | undefined;
  readonly isError: boolean;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  readonly loadMoreFailed: boolean;
  readonly canLoadMore: boolean;
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

export function stockPagesStatus(query: StockPagesQueryState): StockPagesStatus {
  const lastPage = query.data?.pages.at(-1);
  const stalled = query.hasNextPage && lastPage !== undefined && lastPage.stocks.length === 0;
  const loadMoreFailed = !query.isFetching && (query.isFetchNextPageError || stalled);
  return {
    stocks: query.data === undefined ? undefined : uniqueStocks(query.data),
    isError: query.isError && query.data === undefined,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreFailed,
    canLoadMore: query.hasNextPage && !query.isFetching && !loadMoreFailed,
  };
}

export function useStockPages(): StockPagesResult {
  const { restClient, quoteStore } = useCore();
  const query = useInfiniteQuery(stockPagesQueryOptions(restClient, quoteStore));
  const { canLoadMore, ...status } = stockPagesStatus(query);
  const { isFetching, fetchNextPage, refetch } = query;
  const { loadMoreFailed } = status;

  const loadMore = useCallback(() => {
    if (canLoadMore) void fetchNextPage();
  }, [canLoadMore, fetchNextPage]);

  const retry = useCallback(() => {
    if (isFetching) return;
    if (loadMoreFailed) void fetchNextPage();
    else void refetch();
  }, [isFetching, loadMoreFailed, fetchNextPage, refetch]);

  return { ...status, loadMore, retry };
}

"use client";

import { useStockPages, type StockSort } from "@mini/core";
import { ListError } from "../components/list-error.tsx";
import { ListMoreError } from "../components/list-more-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";

const LOADING_MORE_ROWS = 2;

export interface StockListProps {
  morph?: boolean;
  fadingSort?: StockSort | undefined;
}

export function StockList({ morph = true, fadingSort }: StockListProps) {
  const list = useStockPages();
  if (list.stocks !== undefined) {
    return (
      <>
        <VirtualStockList
          stocks={list.stocks}
          listTestId="stock-list"
          morph={morph}
          onEndReached={list.loadMore}
          fadingSort={fadingSort}
        />
        {list.isLoadingMore && <ListSkeleton testId="list-more-loading" rows={LOADING_MORE_ROWS} />}
        {list.loadMoreFailed && <ListMoreError onRetry={list.retry} />}
      </>
    );
  }
  if (list.isError) {
    return <ListError onRetry={list.retry} />;
  }
  return <ListSkeleton testId="list-skeleton" />;
}

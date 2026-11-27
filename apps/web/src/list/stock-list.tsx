"use client";

import { useStockPages } from "@mini/core";
import type { FadingSort } from "../components/stock-list-header.tsx";
import { ListError } from "../components/list-error.tsx";
import { ListMoreError } from "../components/list-more-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";

const LOADING_MORE_ROWS = 2;

export interface StockListProps {
  morph?: boolean;
  fading?: FadingSort | undefined;
}

export function StockList({ morph = true, fading }: StockListProps) {
  const list = useStockPages();
  if (list.stocks !== undefined) {
    return (
      <>
        <VirtualStockList
          stocks={list.stocks}
          listTestId="stock-list"
          morph={morph}
          onEndReached={list.loadMore}
          fading={fading}
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

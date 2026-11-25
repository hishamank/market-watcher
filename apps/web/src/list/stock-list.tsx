"use client";

import { useStockList } from "@mini/core";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";

export function StockList() {
  const list = useStockList();
  if (list.data !== undefined) {
    return <VirtualStockList stocks={list.data.stocks} listTestId="stock-list" />;
  }
  if (list.isError) {
    return <ListError onRetry={() => void list.refetch()} />;
  }
  return <ListSkeleton testId="list-skeleton" />;
}

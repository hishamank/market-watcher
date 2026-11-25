"use client";

import type { Stock } from "@mini/contracts";
import { useStockList } from "@mini/core";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import { StockListHeader } from "../components/stock-list-header.tsx";
import { useWindowRows } from "../integrations/use-window-rows.ts";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

function VirtualRows({ stocks }: { stocks: readonly Stock[] }) {
  const { rows, paddingStart, paddingEnd, listRef, measureRow } = useWindowRows(
    stocks.map((stock) => stock.symbol),
  );
  return (
    <>
      <StockListHeader />
      <ul
        ref={listRef}
        data-testid="stock-list"
        style={{ paddingBlockStart: paddingStart, paddingBlockEnd: paddingEnd }}
      >
        {rows.map((row) => {
          const stock = stocks[row.index];
          return stock === undefined ? null : (
            <li
              key={row.key}
              data-index={row.index}
              ref={measureRow}
              className="border-b border-border last:border-b-0"
            >
              <ConnectedStockRow stock={stock} />
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function StockList() {
  const list = useStockList();
  if (list.data !== undefined) {
    return <VirtualRows stocks={list.data.stocks} />;
  }
  if (list.isError) {
    return <ListError onRetry={() => void list.refetch()} />;
  }
  return <ListSkeleton testId="list-skeleton" />;
}

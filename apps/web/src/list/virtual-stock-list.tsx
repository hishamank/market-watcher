"use client";

import type { Stock } from "@mini/contracts";
import { StockListHeader } from "../components/stock-list-header.tsx";
import { tableScroll, tableWidth } from "../components/stock-row.tsx";
import { useWindowRows } from "../integrations/use-window-rows.ts";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

export interface VirtualStockListProps {
  stocks: readonly Stock[];
  listTestId: string;
  rowTestId?: (symbol: string) => string;
  morph?: boolean;
}

export function VirtualStockList(props: VirtualStockListProps) {
  const { stocks, listTestId, rowTestId, morph = true } = props;
  const { rows, paddingStart, paddingEnd, listRef, measureRow } = useWindowRows(
    stocks.map((stock) => stock.symbol),
  );
  return (
    <div className={tableScroll}>
      <StockListHeader />
      <ul
        ref={listRef}
        data-testid={listTestId}
        className={tableWidth}
        style={{ paddingBlockStart: paddingStart, paddingBlockEnd: paddingEnd }}
      >
        {rows.map((row) => {
          const stock = stocks[row.index];
          return stock === undefined ? null : (
            <li
              key={row.key}
              data-index={row.index}
              data-testid={rowTestId?.(stock.symbol)}
              ref={measureRow}
              className="border-b border-border last:border-b-0"
            >
              <ConnectedStockRow stock={stock} morph={morph} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

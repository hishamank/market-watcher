"use client";

import type { Stock } from "@mini/contracts";
import type { CSSProperties } from "react";
import {
  StockListHeader,
  type FadingSort,
  type HeaderSort,
} from "../components/stock-list-header.tsx";
import { tableScroll, tableWidth } from "../components/stock-row.tsx";
import { starRowName } from "../integrations/star-motion.ts";
import { useWindowRows } from "../integrations/use-window-rows.ts";
import { ConnectedColumnMenu } from "./connected-column-menu.tsx";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

export interface VirtualStockListProps {
  stocks: readonly Stock[];
  listTestId: string;
  rowTestId?: (symbol: string) => string;
  morph?: boolean;
  reflowStar?: ((symbol: string) => void) | undefined;
  onEndReached?: () => void;
  sort?: HeaderSort | undefined;
  fading?: FadingSort | undefined;
}

export function VirtualStockList(props: VirtualStockListProps) {
  const {
    stocks,
    listTestId,
    rowTestId,
    morph = true,
    reflowStar,
    onEndReached,
    sort,
    fading,
  } = props;
  const { rows, paddingStart, paddingEnd, listRef, measureRow } = useWindowRows(
    stocks.map((stock) => stock.symbol),
    onEndReached,
  );
  return (
    <div className={tableScroll}>
      <StockListHeader sort={sort} fading={fading} action={<ConnectedColumnMenu />} />
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
              data-star-row
              style={{ "--star-row": starRowName(stock.symbol) } as CSSProperties}
              className="border-b border-border last:border-b-0"
            >
              <ConnectedStockRow stock={stock} morph={morph} reflowStar={reflowStar} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

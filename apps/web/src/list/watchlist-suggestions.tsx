"use client";

import { useStockList, useT } from "@mini/core";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

const SUGGESTION_COUNT = 3;

export function WatchlistSuggestions() {
  const t = useT();
  const stocks = useStockList().data?.stocks.slice(0, SUGGESTION_COUNT) ?? [];
  if (stocks.length === 0) return null;
  return (
    <section data-testid="watchlist-suggestions" className="border-t border-border">
      <h3 className="px-16 pt-16 pb-8 text-label font-normal text-text-secondary md:px-20">
        {t("watchlist.suggestions.title")}
      </h3>
      <ul>
        {stocks.map((stock) => (
          <li key={stock.symbol} className="border-t border-border">
            <ConnectedStockRow stock={stock} />
          </li>
        ))}
      </ul>
    </section>
  );
}

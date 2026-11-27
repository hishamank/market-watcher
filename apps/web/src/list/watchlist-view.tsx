"use client";

import type { Stock } from "@mini/contracts";
import {
  useSortedStocks,
  useT,
  useWatchlist,
  useWatchlistStocks,
  type WatchlistStocksResult,
} from "@mini/core";
import Link from "next/link";
import type { MouseEvent } from "react";
import { buttonClassName } from "../components/button.tsx";
import { EmptyState } from "../components/empty-state.tsx";
import { StarIcon } from "../components/icons.tsx";
import { useMediaQuery } from "../integrations/use-media-query.ts";
import { useStarTransition } from "../integrations/star-motion.ts";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import type { ListView } from "../components/view-toggle.tsx";
import { useSortParam } from "./use-sort-param.ts";
import { VirtualStockList } from "./virtual-stock-list.tsx";
import { WatchlistSuggestions } from "./watchlist-suggestions.tsx";

export interface WatchlistViewProps {
  onShowAll: (view: ListView, event: MouseEvent) => void;
}

function listedStocks(state: WatchlistStocksResult): readonly Stock[] | undefined {
  if (state.status === "ready") return state.stocks;
  return state.status === "empty" ? [] : undefined;
}

export function WatchlistView({ onShowAll }: WatchlistViewProps) {
  const t = useT();
  const { symbols, toggle } = useWatchlist();
  const reflowStar = useStarTransition(symbols, toggle);
  const state = useWatchlistStocks();
  const { sort, selectSort } = useSortParam();
  const sortable = useMediaQuery("(width >= 48rem)");
  const stocks = useSortedStocks(listedStocks(state), sortable ? sort : undefined);
  if (state.status === "loading") {
    return <ListSkeleton testId="watchlist-skeleton" />;
  }
  if (state.status === "error") {
    return <ListError onRetry={state.retry} />;
  }
  if (state.status === "empty") {
    return (
      <>
        <EmptyState
          testId="watchlist-empty"
          starMotion
          icon={<StarIcon />}
          title={t("watchlist.empty.title")}
          help={t("watchlist.empty.help")}
          action={
            <Link
              href="/"
              onClick={(event) => onShowAll("all", event)}
              className={buttonClassName()}
            >
              {t("watchlist.empty.action")}
            </Link>
          }
        />
        <WatchlistSuggestions onStar={reflowStar} />
      </>
    );
  }
  return (
    <VirtualStockList
      stocks={stocks}
      listTestId="watchlist"
      rowTestId={(symbol) => `watchlist-row-${symbol}`}
      reflowStar={stocks.length === 1 ? reflowStar : undefined}
      sort={{ current: sort, onSelect: selectSort }}
    />
  );
}

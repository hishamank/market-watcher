"use client";

import { useT, useWatchlist } from "@mini/core";
import Link from "next/link";
import type { MouseEvent } from "react";
import { buttonClassName } from "../components/button.tsx";
import { EmptyState } from "../components/empty-state.tsx";
import { StarIcon } from "../components/icons.tsx";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import type { ListView } from "../components/view-toggle.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";
import { WatchlistSuggestions } from "./watchlist-suggestions.tsx";
import { useWatchlistStocks } from "./watchlist-stocks.ts";

export interface WatchlistViewProps {
  onShowAll: (view: ListView, event: MouseEvent) => void;
}

export function WatchlistView({ onShowAll }: WatchlistViewProps) {
  const t = useT();
  const { isLoaded, symbols } = useWatchlist();
  const state = useWatchlistStocks(symbols, isLoaded);
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
        <WatchlistSuggestions />
      </>
    );
  }
  return (
    <VirtualStockList
      stocks={state.stocks}
      listTestId="watchlist"
      rowTestId={(symbol) => `watchlist-row-${symbol}`}
    />
  );
}

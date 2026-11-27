"use client";

import { useT, useWatchlist, useWatchlistStocks } from "@mini/core";
import Link from "next/link";
import type { MouseEvent } from "react";
import { buttonClassName } from "../components/button.tsx";
import { EmptyState } from "../components/empty-state.tsx";
import { StarIcon } from "../components/icons.tsx";
import { useStarTransition } from "../integrations/star-motion.ts";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import type { ListView } from "../components/view-toggle.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";
import { WatchlistSuggestions } from "./watchlist-suggestions.tsx";

export interface WatchlistViewProps {
  onShowAll: (view: ListView, event: MouseEvent) => void;
}

export function WatchlistView({ onShowAll }: WatchlistViewProps) {
  const t = useT();
  const { symbols, toggle, isLoaded } = useWatchlist();
  const reflowStar = useStarTransition(symbols, toggle);
  const state = useWatchlistStocks();
  if (!isLoaded || state.status === "empty") {
    return (
      <>
        {isLoaded ? null : (
          <div className="stored-watchlist-empty:hidden">
            <ListSkeleton testId="watchlist-skeleton" />
          </div>
        )}
        <div className={isLoaded ? undefined : "hidden stored-watchlist-empty:block"}>
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
        </div>
      </>
    );
  }
  if (state.status === "loading") {
    return <ListSkeleton testId="watchlist-skeleton" />;
  }
  if (state.status === "error") {
    return <ListError onRetry={state.retry} />;
  }
  return (
    <VirtualStockList
      stocks={state.stocks}
      listTestId="watchlist"
      rowTestId={(symbol) => `watchlist-row-${symbol}`}
      reflowStar={state.stocks.length === 1 ? reflowStar : undefined}
    />
  );
}

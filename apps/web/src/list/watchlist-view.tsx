"use client";

import { useT, useWatchlist } from "@mini/core";
import Link from "next/link";
import { buttonClassName } from "../components/button.tsx";
import { EmptyState } from "../components/empty-state.tsx";
import { StarIcon } from "../components/icons.tsx";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";
import { VirtualStockList } from "./virtual-stock-list.tsx";
import { useWatchlistStocks } from "./watchlist-stocks.ts";

export function WatchlistView() {
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
      <EmptyState
        testId="watchlist-empty"
        icon={<StarIcon />}
        title={t("watchlist.empty.title")}
        help={t("watchlist.empty.help")}
        action={
          <Link href="/" className={buttonClassName()}>
            {t("watchlist.empty.action")}
          </Link>
        }
      />
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

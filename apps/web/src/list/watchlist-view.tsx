"use client";

import { useT, useWatchlist } from "@mini/core";
import Link from "next/link";
import { buttonClassName } from "../components/button.tsx";
import { EmptyState } from "../components/empty-state.tsx";
import { StarIcon } from "../components/icons.tsx";
import { ListSkeleton } from "../components/list-skeleton.tsx";

export function WatchlistView() {
  const t = useT();
  const { isLoaded, symbols } = useWatchlist();
  if (!isLoaded || symbols.length > 0) {
    return <ListSkeleton testId="watchlist-skeleton" />;
  }
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

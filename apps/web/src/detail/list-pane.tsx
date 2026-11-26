"use client";

import { ListSkeleton } from "../components/list-skeleton.tsx";
import { useMediaQuery } from "../integrations/use-media-query.ts";
import { StockList } from "../list/stock-list.tsx";

export function ListPane() {
  const wide = useMediaQuery("(width >= 80rem)");
  return (
    <aside
      data-list-pane
      data-testid="list-pane"
      className="hidden w-[400px] shrink-0 self-start overflow-hidden rounded-xl border border-border bg-surface shadow-1 xl:block"
    >
      {wide ? <StockList morph={false} /> : <ListSkeleton testId="list-pane-skeleton" />}
    </aside>
  );
}

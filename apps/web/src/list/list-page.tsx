"use client";

import { useWatchlist, type StockSort } from "@mini/core";
import { useState, type MouseEvent } from "react";
import { useTableColumns } from "../columns/use-table-columns.ts";
import { ViewToggle, type ListView } from "../components/view-toggle.tsx";
import { useMediaQuery } from "../integrations/use-media-query.ts";
import { StockList } from "./stock-list.tsx";
import { customColumnStyle } from "./table-layout.ts";
import { useSortParam } from "./use-sort-param.ts";
import { useViewParam, viewHref } from "./use-view-param.ts";
import { WatchlistView } from "./watchlist-view.tsx";

interface LeavingSort {
  readonly sort: StockSort;
  readonly shown: boolean;
}

export function ListPage() {
  const { view, selectView } = useViewParam();
  const { sort } = useSortParam();
  const wide = useMediaQuery("(width >= 48rem)");
  const [leaving, setLeaving] = useState<LeavingSort | undefined>(undefined);
  const { chosen } = useTableColumns();
  const watchlist = useWatchlist();
  if (leaving !== undefined && view === "all" && !leaving.shown) {
    setLeaving({ sort: leaving.sort, shown: true });
  }
  if (leaving !== undefined && view === "watchlist" && leaving.shown) setLeaving(undefined);
  const switchView = (next: ListView, event: MouseEvent) => {
    selectView(next, event);
    const fading = wide && view === "watchlist" && next === "all" ? sort : undefined;
    if (event.defaultPrevented) {
      setLeaving(fading === undefined ? undefined : { sort: fading, shown: false });
    }
  };
  return (
    <main className="flex flex-1 flex-col md:p-24">
      <div className="mx-auto flex w-full flex-col md:max-w-[720px] md:gap-16 xl:max-w-[1120px] min-[90rem]:max-w-[1344px]">
        <div className="flex items-center justify-between gap-12 px-16 pt-4 pb-12 md:p-0">
          <ViewToggle
            view={view}
            hrefFor={viewHref}
            onSelect={switchView}
            watchlistSymbols={watchlist.symbols}
            watchlistLoaded={watchlist.isLoaded}
          />
        </div>
        <section
          data-custom-columns={chosen === undefined ? undefined : ""}
          style={chosen === undefined ? undefined : customColumnStyle(chosen)}
          className="border-t border-border bg-surface md:overflow-hidden md:rounded-xl md:border md:shadow-1"
        >
          {view === "watchlist" ? (
            <WatchlistView onShowAll={selectView} />
          ) : (
            <StockList
              fading={
                leaving === undefined
                  ? undefined
                  : { sort: leaving.sort, onEnd: () => setLeaving(undefined) }
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}

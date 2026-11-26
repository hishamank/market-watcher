"use client";

import { ViewToggle } from "../components/view-toggle.tsx";
import { StockList } from "./stock-list.tsx";
import { useViewParam, viewHref } from "./use-view-param.ts";
import { WatchlistView } from "./watchlist-view.tsx";

export function ListPage() {
  const { view, selectView } = useViewParam();
  return (
    <main className="flex flex-1 flex-col md:p-24">
      <div className="mx-auto flex w-full flex-col md:max-w-[720px] md:gap-16 xl:max-w-[1120px] min-[90rem]:max-w-[1344px]">
        <div className="px-16 pt-4 pb-12 md:p-0">
          <ViewToggle view={view} hrefFor={viewHref} onSelect={selectView} />
        </div>
        <section className="border-t border-border bg-surface md:overflow-hidden md:rounded-xl md:border md:shadow-1">
          {view === "watchlist" ? <WatchlistView onShowAll={selectView} /> : <StockList />}
        </section>
      </div>
    </main>
  );
}

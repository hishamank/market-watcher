"use client";

import { ViewToggle, type ListView } from "../components/view-toggle.tsx";
import { StockList } from "./stock-list.tsx";
import { WatchlistView } from "./watchlist-view.tsx";

export function ListPage({ view }: { view: ListView }) {
  return (
    <main className="flex flex-1 flex-col md:p-24">
      <div className="mx-auto flex w-full flex-col md:max-w-[720px] md:gap-16 xl:max-w-[1120px]">
        <div className="px-16 pt-4 pb-12 md:p-0">
          <ViewToggle view={view} />
        </div>
        <section className="border-t border-border bg-surface md:overflow-hidden md:rounded-xl md:border md:shadow-1">
          {view === "watchlist" ? <WatchlistView /> : <StockList />}
        </section>
      </div>
    </main>
  );
}

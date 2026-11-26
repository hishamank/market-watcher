"use client";

import { useTableColumns } from "@mini/core";
import { ViewToggle, type ListView } from "../components/view-toggle.tsx";
import { ConnectedColumnMenu } from "./connected-column-menu.tsx";
import { StockList } from "./stock-list.tsx";
import { customColumnStyle } from "./table-layout.ts";
import { WatchlistView } from "./watchlist-view.tsx";

export function ListPage({ view }: { view: ListView }) {
  const { chosen } = useTableColumns();
  return (
    <main className="flex flex-1 flex-col md:p-24">
      <div className="mx-auto flex w-full flex-col md:max-w-[720px] md:gap-16 xl:max-w-[1120px] min-[90rem]:max-w-[1344px]">
        <div className="flex items-center justify-between gap-12 px-16 pt-4 pb-12 md:p-0">
          <ViewToggle view={view} />
          <ConnectedColumnMenu />
        </div>
        <section
          data-custom-columns={chosen === undefined ? undefined : ""}
          style={chosen === undefined ? undefined : customColumnStyle(chosen)}
          className="border-t border-border bg-surface md:overflow-hidden md:rounded-xl md:border md:shadow-1"
        >
          {view === "watchlist" ? <WatchlistView /> : <StockList />}
        </section>
      </div>
    </main>
  );
}

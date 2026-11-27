"use client";

import type { StockSort } from "@mini/core";
import { useSearchParams } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useTableColumns } from "../columns/use-table-columns.ts";
import { ViewToggle, type ListView } from "../components/view-toggle.tsx";
import { ConnectedColumnMenu } from "./connected-column-menu.tsx";
import { StockList } from "./stock-list.tsx";
import { customColumnStyle } from "./table-layout.ts";
import { useSortParam } from "./use-sort-param.ts";
import { useViewParam, viewHref } from "./use-view-param.ts";
import { WatchlistView } from "./watchlist-view.tsx";

interface LeavingSort {
  readonly sort: StockSort;
  readonly from: string;
}

export function ListPage() {
  const { view, selectView } = useViewParam();
  const { sort } = useSortParam();
  const search = useSearchParams().toString();
  const [leaving, setLeaving] = useState<LeavingSort | undefined>(undefined);
  const { chosen } = useTableColumns();
  if (view === "watchlist" && leaving !== undefined && leaving.from !== search) {
    setLeaving(undefined);
  }
  const switchView = (next: ListView, event: MouseEvent) => {
    const fading = view === "watchlist" && next === "all" ? sort : undefined;
    setLeaving(fading === undefined ? undefined : { sort: fading, from: search });
    selectView(next, event);
  };
  return (
    <main className="flex flex-1 flex-col md:p-24">
      <div className="mx-auto flex w-full flex-col md:max-w-[720px] md:gap-16 xl:max-w-[1120px] min-[90rem]:max-w-[1344px]">
        <div className="flex items-center justify-between gap-12 px-16 pt-4 pb-12 md:p-0">
          <ViewToggle view={view} hrefFor={viewHref} onSelect={switchView} />
          <ConnectedColumnMenu />
        </div>
        <section
          data-custom-columns={chosen === undefined ? undefined : ""}
          style={chosen === undefined ? undefined : customColumnStyle(chosen)}
          className="border-t border-border bg-surface md:overflow-hidden md:rounded-xl md:border md:shadow-1"
        >
          {view === "watchlist" ? (
            <WatchlistView onShowAll={switchView} />
          ) : (
            <StockList fadingSort={leaving?.sort} />
          )}
        </section>
      </div>
    </main>
  );
}

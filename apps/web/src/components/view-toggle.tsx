import { useT } from "@mini/core";
import Link from "next/link";
import type { MouseEvent } from "react";
import { SegmentTrack, segmentStyle } from "./segment-track.tsx";
import { WatchlistCount } from "./watchlist-count.tsx";

export type ListView = "all" | "watchlist";

export interface ViewToggleProps {
  view: ListView;
  hrefFor: (view: ListView) => string;
  onSelect: (view: ListView, event: MouseEvent) => void;
  watchlistCount: number;
  watchlistLoaded: boolean;
}

const views: readonly ListView[] = ["all", "watchlist"];

export function ViewToggle(props: ViewToggleProps) {
  const { view, hrefFor, onSelect, watchlistCount, watchlistLoaded } = props;
  const t = useT();
  const selectedIndex = views.indexOf(view);
  return (
    <nav aria-label={t("list.view.label")} className="w-full md:w-[320px]">
      <SegmentTrack selected={selectedIndex} className="flex gap-2">
        {(ready) =>
          views.map((option) => {
            const selected = option === view;
            return (
              <Link
                key={option}
                href={hrefFor(option)}
                onClick={(event) => onSelect(option, event)}
                data-segment
                data-testid={`view-toggle-${option}`}
                aria-current={selected ? "page" : undefined}
                className={`grid min-h-[44px] flex-1 place-items-center rounded-sm text-label ${segmentStyle(selected, ready)}`}
              >
                <span className="inline-flex items-center gap-6">
                  {t(option === "all" ? "list.view.all" : "list.view.watchlist")}
                  {option === "watchlist" ? (
                    <WatchlistCount count={watchlistCount} loaded={watchlistLoaded} />
                  ) : null}
                </span>
              </Link>
            );
          })
        }
      </SegmentTrack>
    </nav>
  );
}

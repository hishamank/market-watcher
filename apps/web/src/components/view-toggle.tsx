import { useT } from "@mini/core";
import Link from "next/link";
import { SegmentTrack, segmentStyle } from "./segment-track.tsx";

export type ListView = "all" | "watchlist";

export interface ViewToggleProps {
  view: ListView;
}

const options: ReadonlyArray<{ view: ListView; href: string }> = [
  { view: "all", href: "/" },
  { view: "watchlist", href: "/?view=watchlist" },
];

export function ViewToggle({ view }: ViewToggleProps) {
  const t = useT();
  const selectedIndex = options.findIndex((option) => option.view === view);
  return (
    <nav aria-label={t("list.view.label")} className="md:w-[320px]">
      <SegmentTrack selected={selectedIndex} className="flex gap-2">
        {(ready) =>
          options.map((option) => {
            const selected = option.view === view;
            return (
              <Link
                key={option.view}
                href={option.href}
                data-segment
                data-testid={`view-toggle-${option.view}`}
                aria-current={selected ? "page" : undefined}
                className={`grid min-h-[44px] flex-1 place-items-center rounded-sm text-label ${segmentStyle(selected, ready)}`}
              >
                {t(option.view === "all" ? "list.view.all" : "list.view.watchlist")}
              </Link>
            );
          })
        }
      </SegmentTrack>
    </nav>
  );
}

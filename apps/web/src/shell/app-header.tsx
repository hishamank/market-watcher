import type { FeedMode, MarketStatus } from "@mini/contracts";
import { useT } from "@mini/core";
import { FeedModeBadge } from "./feed-mode-badge.tsx";
import { MarketClosedLabel } from "./market-closed-label.tsx";

export interface AppHeaderProps {
  feedMode: FeedMode | null;
  marketStatus: MarketStatus | null;
}

export function AppHeader({ feedMode, marketStatus }: AppHeaderProps) {
  const t = useT();
  return (
    <header className="flex min-h-[64px] items-center gap-8 ps-16 pe-6 md:min-h-[72px] md:gap-12 md:border-b md:border-border md:px-24">
      <div className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-12">
        <h1 className="text-heading-md">{t("header.title")}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-8 md:mt-0">
          {feedMode === null ? null : <FeedModeBadge feedMode={feedMode} />}
          {marketStatus === "closed" ? <MarketClosedLabel /> : null}
        </div>
      </div>
    </header>
  );
}

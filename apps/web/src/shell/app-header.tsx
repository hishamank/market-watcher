import type { FeedMode, MarketStatus } from "@mini/contracts";
import { useT } from "@mini/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark, ChevronStartIcon } from "../components/icons.tsx";
import { FeedModeBadge } from "./feed-mode-badge.tsx";
import { MarketClosedLabel } from "./market-closed-label.tsx";
import { iconPressMotion } from "../components/button.tsx";

export interface AppHeaderProps {
  feedMode: FeedMode | null;
  marketStatus: MarketStatus | null;
  showBack: boolean;
  backHref: string;
  search?: ReactNode;
  themeSwitch?: ReactNode;
}

export function AppHeader({
  feedMode,
  marketStatus,
  showBack,
  backHref,
  search,
  themeSwitch,
}: AppHeaderProps) {
  const t = useT();
  return (
    <header className="md:border-b md:border-border xl:flex xl:min-h-[72px] xl:items-center xl:gap-12 xl:px-24">
      <div
        role="status"
        className="flex min-h-[28px] items-center gap-12 bg-fill px-16 py-4 max-xl:empty:hidden md:px-24 xl:min-h-0 xl:flex-1 xl:gap-8 xl:bg-transparent xl:p-0"
      >
        {feedMode === null ? null : <FeedModeBadge feedMode={feedMode} />}
        {marketStatus === "closed" ? <MarketClosedLabel /> : null}
      </div>
      <div className="flex min-h-[56px] items-center gap-8 ps-16 pe-6 md:min-h-[72px] md:gap-12 md:px-24 xl:contents">
        {showBack ? (
          <Link
            href={backHref}
            aria-label={t(backHref === "/" ? "detail.back" : "list.view.watchlist")}
            data-testid="header-back"
            className={`-ms-10 me-auto grid size-[44px] shrink-0 place-items-center rounded-md text-text-secondary md:hidden ${iconPressMotion}`}
          >
            <ChevronStartIcon />
          </Link>
        ) : null}
        <div
          className={`min-w-0 flex-1 items-center gap-8 xl:-order-1 xl:flex-none ${showBack ? "hidden md:flex" : "flex"}`}
        >
          <BrandMark />
          <h1 className="text-heading-md">{t("header.title")}</h1>
        </div>
        {search}
        {themeSwitch}
      </div>
    </header>
  );
}

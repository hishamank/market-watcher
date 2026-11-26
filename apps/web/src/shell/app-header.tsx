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
  search?: ReactNode;
}

export function AppHeader({ feedMode, marketStatus, showBack, search }: AppHeaderProps) {
  const t = useT();
  return (
    <header className="flex min-h-[64px] items-center gap-8 ps-16 pe-6 md:min-h-[72px] md:gap-12 md:border-b md:border-border md:px-24">
      {showBack ? (
        <Link
          href="/"
          aria-label={t("detail.back")}
          data-testid="header-back"
          className={`-ms-10 grid size-[44px] shrink-0 place-items-center rounded-md text-text-secondary md:hidden ${iconPressMotion}`}
        >
          <ChevronStartIcon />
        </Link>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-12">
        <div className={`items-center gap-8 ${showBack ? "hidden md:flex" : "flex"}`}>
          <BrandMark />
          <h1 className="text-heading-md">{t("header.title")}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-8 md:mt-0">
          {feedMode === null ? null : <FeedModeBadge feedMode={feedMode} />}
          {marketStatus === "closed" ? <MarketClosedLabel /> : null}
        </div>
      </div>
      {search}
    </header>
  );
}

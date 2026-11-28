"use client";

import { useTrackOnce } from "@mini/analytics";
import { useStock, useT } from "@mini/core";
import Link from "next/link";
import { useState } from "react";
import { DetailError } from "../components/detail-error.tsx";
import { ChevronStartIcon } from "../components/icons.tsx";
import { RangeTabs } from "../components/range-tabs.tsx";
import { DetailSkeleton } from "../components/detail-skeleton.tsx";
import { ConnectedStockStatistics } from "./connected-stock-statistics.tsx";
import { ConnectedStockNews } from "./connected-stock-news.tsx";
import { ConnectedStockEarnings } from "./connected-stock-earnings.tsx";
import { ConnectedCompanyProfile } from "./connected-company-profile.tsx";
import { ConnectedDetailHeader } from "./connected-detail-header.tsx";
import { ConnectedPriceChart } from "./connected-price-chart.tsx";
import { ConnectedDetailFacts } from "./connected-detail-facts.tsx";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { ListPane } from "./list-pane.tsx";
import { scrubFor, type ScrubSelection } from "./scrub-selection.ts";
import { useStockOpened } from "../integrations/opening-stock.ts";
import { useRangeParam } from "./use-range-param.ts";

function DetailCard({ symbol }: { symbol: string }) {
  const { range, selectRange } = useRangeParam(symbol);
  const query = useStock(symbol);
  const [selection, setSelection] = useState<ScrubSelection>();
  const scrub = scrubFor(selection, range);
  const stock = query.data?.stock;
  useTrackOnce(stock === undefined ? null : { name: "stock_opened", symbol }, symbol);
  if (stock === undefined) {
    return query.status === "error" ? (
      <DetailError onRetry={() => void query.refetch()} />
    ) : (
      <DetailSkeleton />
    );
  }
  return (
    <>
      <div className="px-16 pt-16 md:p-0">
        <ConnectedDetailHeader stock={stock} range={range} scrub={scrub} />
      </div>
      <div className="px-16 md:px-0">
        <ConnectedPriceChart
          symbol={symbol}
          range={range}
          scrub={scrub}
          onScrub={(point) => setSelection(point && { range, point })}
        />
      </div>
      <div className="px-16 pt-8 md:px-0 md:pt-12">
        <RangeTabs range={range} onSelect={selectRange} />
      </div>
      <div className="pt-16 md:pt-20">
        <ConnectedDetailFacts stock={stock} />
      </div>
    </>
  );
}

export function DetailPage({ symbol }: { symbol: string }) {
  const t = useT();
  useStockOpened(symbol);
  const { listHref } = useListNavigation();
  return (
    <main className="flex flex-1 flex-col pb-24 md:p-24">
      <div className="mx-auto flex w-full items-start gap-24 md:max-w-[720px] xl:max-w-[1392px]">
        <ListPane />
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          <Link
            href={listHref}
            data-testid="detail-back"
            className="hidden min-h-[44px] items-center gap-4 self-start rounded-md pe-12 text-label text-text-secondary transition-colors duration-(--duration-fast) hover:text-text md:inline-flex"
          >
            <ChevronStartIcon />
            {t(listHref === "/" ? "detail.back" : "list.view.watchlist")}
          </Link>
          <section className="flex flex-col md:rounded-xl md:border md:border-border md:bg-surface md:p-24 md:shadow-1">
            <DetailCard symbol={symbol} />
          </section>
          <ConnectedStockStatistics key={`statistics-${symbol}`} symbol={symbol} />
          <ConnectedStockEarnings key={`earnings-${symbol}`} symbol={symbol} />
          <ConnectedCompanyProfile key={symbol} symbol={symbol} />
          <ConnectedStockNews key={`news-${symbol}`} symbol={symbol} />
        </div>
      </div>
    </main>
  );
}

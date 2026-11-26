"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useCore } from "../core-provider.tsx";
import { formatMarketDate, formatMarketDateTime, formatMarketTime } from "../format/time-format.ts";
import { newsQueryOptions } from "../rest/news-query.ts";
import { useLocale, useT } from "./use-t.ts";

export function useStockNews(symbol: string) {
  const { fetchNews } = useCore();
  const query = useQuery(newsQueryOptions(fetchNews, symbol));
  const t = useT();
  const locale = useLocale();
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(new Set());
  const retry = () => {
    void query.refetch();
  };
  if (!query.data) return { status: query.isError ? "error" : "loading", retry } as const;
  const { articles, source, fetchedAt } = query.data;
  if (articles.length === 0) return { status: "empty" } as const;
  const expanded = expandedSymbol === symbol;
  const simulated = source === "simulated";
  return {
    status: "ready",
    articles: articles.slice(0, expanded ? 9 : 3).map((item) => ({
      id: item.id,
      title: item.title,
      href: simulated ? null : item.url,
      publisher: simulated ? t("news.sampleStory") : (item.publisher ?? item.site),
      publishedAt: new Date(item.publishedAt).toISOString(),
      publishedLabel: `${formatMarketDate(item.publishedAt, { locale, includeYear: true })} · ${formatMarketTime(item.publishedAt, { locale })}`,
      thumbnail: item.thumbnail && !failedImages.has(item.thumbnail) ? item.thumbnail : null,
      onImageError: () => {
        const url = item.thumbnail;
        if (url) setFailedImages((previous) => new Set([...previous, url]));
      },
    })),
    expanded,
    hasMore: articles.length > 3,
    toggle: () => setExpandedSymbol(expanded ? null : symbol),
    attribution: t(simulated ? "news.sample" : "news.source"),
    sourceUrl: simulated ? null : "https://finance.yahoo.com/",
    retrieved: simulated
      ? null
      : t("profile.retrieved", { time: formatMarketDateTime(fetchedAt, { locale }) }),
  } as const;
}

export type StockNewsView = ReturnType<typeof useStockNews>;

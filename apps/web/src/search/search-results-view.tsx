import type { SearchMatch } from "@mini/contracts";
import { type SearchResult, useT } from "@mini/core";
import Link from "next/link";
import { Button } from "../components/button.tsx";
import { AlertIcon, SearchIcon } from "../components/icons.tsx";
import { Skeleton } from "../components/skeleton.tsx";
import { StarButton } from "../components/star-button.tsx";
import { splitHighlight } from "./highlight-match.ts";
export interface SearchResultsViewProps {
  listboxId: string;
  optionId: (symbol: string) => string;
  stockHref: (symbol: string) => string;
  query: string;
  status: SearchResult["status"];
  results: readonly SearchMatch[];
  activeIndex: number;
  isWatchlistLoaded: boolean;
  isStarred: (symbol: string) => boolean;
  onSelect: (symbol: string) => void;
  onToggleStar: (symbol: string) => void;
  onRetry: () => void;
}
const SKELETON_ROWS = [0, 1, 2, 3] as const;
function HighlightedText({
  text,
  query,
  mode,
}: {
  text: string;
  query: string;
  mode: "prefix" | "word";
}) {
  const parts = splitHighlight(text, query, mode);
  if (parts.match.length === 0) return <>{text}</>;
  return (
    <>
      {parts.before}
      <mark className="rounded-[3px] bg-accent-tint px-[1px] font-semibold text-text">
        {parts.match}
      </mark>
      {parts.after}
    </>
  );
}

function SearchLoadingRows() {
  return (
    <div aria-busy="true" className="divide-y divide-border">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex min-h-[56px] items-center gap-12 ps-16 pe-6">
          <Skeleton className="h-[16px] w-[52px] shrink-0" />
          <Skeleton className="h-[14px] flex-1" />
          <span className="grid size-[44px] shrink-0 place-items-center">
            <Skeleton className="size-[20px]" pill />
          </span>
        </div>
      ))}
    </div>
  );
}

function SearchMessageState({
  icon,
  title,
  help,
  action,
}: {
  icon: "search" | "alert";
  title: string;
  help: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-20 py-24 text-center">
      <span className="mb-4 grid size-[48px] place-items-center rounded-full bg-fill text-text-secondary">
        {icon === "search" ? <SearchIcon size="size-[20px]" /> : <AlertIcon />}
      </span>
      <p className="text-body-strong text-text">{title}</p>
      <p className="max-w-[280px] text-label font-normal text-text-secondary">{help}</p>
      {action ? (
        <div className="mt-8">
          <Button onClick={action.onClick} compact>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SearchResultRow({
  item,
  id,
  query,
  highlighted,
  starred,
  onSelect,
  onToggleStar,
  href,
}: {
  item: SearchMatch;
  id: string;
  query: string;
  highlighted: boolean;
  starred: boolean | undefined;
  onSelect: () => void;
  onToggleStar: () => void;
  href: string;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={highlighted}
      data-testid={`search-result-${item.symbol}`}
      className={`flex min-h-[56px] items-center pe-6 transition-colors duration-(--duration-fast) ease-standard ${highlighted ? "bg-fill" : "hover:bg-hover"}`}
    >
      <Link
        prefetch={false}
        href={href}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-12 self-stretch ps-16 pe-8 focus-visible:outline-offset-[-2px]"
      >
        <bdi dir="ltr" className="w-[60px] shrink-0 text-label font-semibold text-text">
          <HighlightedText text={item.symbol} query={query} mode="prefix" />
        </bdi>
        <bdi className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap rtl:text-end text-label font-normal text-text-secondary">
          <HighlightedText text={item.name} query={query} mode="word" />
        </bdi>
      </Link>
      <StarButton
        name={item.name}
        starred={starred}
        onToggle={onToggleStar}
        testId={`search-result-star-${item.symbol}`}
      />
    </div>
  );
}

export function SearchResultsView(props: SearchResultsViewProps) {
  const t = useT();
  const { status, results, query, activeIndex, listboxId, optionId } = props;
  if (status === "idle") {
    return (
      <SearchMessageState
        icon="search"
        title={t("search.idle.title")}
        help={t("search.idle.help")}
      />
    );
  }
  if (status === "loading") return <SearchLoadingRows />;
  if (status === "error") {
    return (
      <SearchMessageState
        icon="alert"
        title={t("search.error.title")}
        help={t("search.error.help")}
        action={{ label: t("search.error.retry"), onClick: props.onRetry }}
      />
    );
  }
  if (results.length === 0) {
    return (
      <SearchMessageState
        icon="search"
        title={t("search.noResults.title", { query })}
        help={t("search.noResults.help")}
      />
    );
  }
  return (
    <>
      <div
        id={listboxId}
        role="listbox"
        aria-label={t("search.resultsCount", { count: results.length })}
        className="divide-y divide-border"
      >
        {results.map((item, index) => (
          <SearchResultRow
            href={props.stockHref(item.symbol)}
            key={item.symbol}
            item={item}
            id={optionId(item.symbol)}
            query={query}
            highlighted={index === activeIndex}
            starred={props.isWatchlistLoaded ? props.isStarred(item.symbol) : undefined}
            onSelect={() => props.onSelect(item.symbol)}
            onToggleStar={() => props.onToggleStar(item.symbol)}
          />
        ))}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {t("search.resultsCount", { count: results.length })}
      </span>
    </>
  );
}

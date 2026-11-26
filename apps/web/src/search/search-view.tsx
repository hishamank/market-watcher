import { MAX_SEARCH_QUERY_LENGTH, type SearchMatch } from "@mini/contracts";
import { type SearchResult, useT } from "@mini/core";
import type { FocusEvent, KeyboardEvent, RefObject } from "react";
import { ChevronStartIcon, CloseIcon, SearchIcon, SpinnerIcon } from "../components/icons.tsx";
import { SearchResultsView } from "./search-results-view.tsx";
import { iconPressMotion } from "../components/button.tsx";

export interface SearchViewProps {
  containerRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  listboxId: string;
  optionId: (symbol: string) => string;
  activeOptionId: string | undefined;
  query: string;
  activeQuery: string;
  status: SearchResult["status"];
  isFetching: boolean;
  results: readonly SearchMatch[];
  activeIndex: number;
  panelOpen: boolean;
  sheetOpen: boolean;
  isWatchlistLoaded: boolean;
  isStarred: (symbol: string) => boolean;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onContainerBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onSelect: (symbol: string) => void;
  onToggleStar: (symbol: string) => void;
  onRetry: () => void;
}

function SearchField(props: SearchViewProps) {
  const t = useT();
  const { query, isFetching, panelOpen, sheetOpen } = props;
  return (
    <div className="flex min-h-[48px] flex-1 items-center gap-8 rounded-lg border border-transparent bg-fill ps-14 pe-4 focus-within:border-focus focus-within:ring-1 focus-within:ring-focus">
      <SearchIcon size="size-[20px]" className="text-text-secondary" />
      <input
        ref={props.inputRef}
        data-testid="search-input"
        type="text"
        inputMode="search"
        autoComplete="off"
        maxLength={MAX_SEARCH_QUERY_LENGTH}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={panelOpen || sheetOpen}
        aria-controls={props.listboxId}
        aria-activedescendant={props.activeOptionId}
        aria-label={t("search.placeholder")}
        placeholder={t("search.placeholder")}
        value={query}
        onFocus={props.onFocus}
        onChange={(event) => props.onQueryChange(event.target.value)}
        onKeyDown={props.onKeyDown}
        className="min-w-0 flex-1 bg-transparent text-body text-text placeholder:text-text-secondary focus-visible:outline-none"
      />
      {isFetching ? (
        <span
          aria-hidden="true"
          className="grid size-[44px] shrink-0 place-items-center text-text-secondary"
        >
          <SpinnerIcon className="motion-safe:animate-spin" />
        </span>
      ) : query.length > 0 ? (
        <button
          type="button"
          aria-label={t("search.clear")}
          onClick={props.onClear}
          className={`grid size-[44px] shrink-0 place-items-center rounded-md text-text-secondary ${iconPressMotion}`}
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

export function SearchView(props: SearchViewProps) {
  const t = useT();
  const { sheetOpen, panelOpen } = props;
  const containerClass = sheetOpen
    ? "fixed inset-0 z-50 flex flex-col bg-surface motion-safe:animate-sheet-in motion-reduce:animate-fade-in md:static md:inset-auto md:z-auto md:block md:w-[380px] md:bg-transparent md:animate-none"
    : "hidden md:relative md:block md:w-[380px]";

  return (
    <>
      <button
        ref={props.triggerRef}
        type="button"
        aria-label={t("search.open")}
        onClick={props.onOpenSheet}
        className={`grid size-[44px] shrink-0 place-items-center rounded-md text-text-secondary md:hidden ${iconPressMotion}`}
      >
        <SearchIcon />
      </button>
      <div
        ref={props.containerRef}
        role={sheetOpen ? "dialog" : undefined}
        aria-modal={sheetOpen ? true : undefined}
        aria-label={sheetOpen ? t("search.dialogLabel") : undefined}
        tabIndex={sheetOpen ? -1 : undefined}
        onBlur={props.onContainerBlur}
        className={`${containerClass} focus-visible:outline-none`}
      >
        <div
          className={
            sheetOpen
              ? "flex items-center gap-6 border-b border-border px-10 py-10 md:block md:border-b-0 md:p-0"
              : ""
          }
        >
          {sheetOpen ? (
            <button
              type="button"
              aria-label={t("detail.back")}
              onClick={props.onCloseSheet}
              className={`grid size-[44px] shrink-0 place-items-center rounded-md text-text-secondary md:hidden ${iconPressMotion}`}
            >
              <ChevronStartIcon />
            </button>
          ) : null}
          <SearchField {...props} />
        </div>
        {panelOpen || sheetOpen ? (
          <div
            tabIndex={-1}
            className="flex-1 overflow-y-auto focus-visible:outline-none md:absolute md:inset-x-0 md:top-full md:z-40 md:mt-8 md:max-h-[480px] md:flex-none md:overflow-y-auto md:rounded-lg md:border md:border-border md:bg-raised md:shadow-2 md:motion-safe:animate-dropdown-in md:motion-reduce:animate-fade-in"
          >
            <SearchResultsView
              listboxId={props.listboxId}
              optionId={props.optionId}
              query={props.activeQuery}
              status={props.status}
              results={props.results}
              activeIndex={props.activeIndex}
              isWatchlistLoaded={props.isWatchlistLoaded}
              isStarred={props.isStarred}
              onSelect={props.onSelect}
              onToggleStar={props.onToggleStar}
              onRetry={props.onRetry}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

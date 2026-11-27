"use client";

import type { SearchMatch } from "@mini/contracts";
import { useSearch, useWatchlist } from "@mini/core";
import { useRouter } from "next/navigation";
import { type FocusEvent, type KeyboardEvent, useId, useRef, useState } from "react";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { useMediaQuery } from "../integrations/use-media-query.ts";
import { useModalDialog } from "../integrations/use-modal-dialog.ts";
import { useScrollActiveOption } from "../integrations/use-scroll-active-option.ts";
import { SearchView } from "./search-view.tsx";
import { useResultChoice } from "./use-result-choice.ts";

interface KeyHandlerContext {
  results: readonly SearchMatch[];
  activeOption: SearchMatch | undefined;
  onOpen: () => void;
  onClose: () => void;
  onMove: (delta: 1 | -1) => void;
  onChoose: (symbol: string) => void;
}

function nextIndex(prev: number, delta: 1 | -1, count: number): number {
  if (count === 0) return -1;
  return delta === 1 ? (prev + 1) % count : prev <= 0 ? count - 1 : prev - 1;
}

function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>, ctx: KeyHandlerContext): void {
  if (event.key === "Escape") {
    event.preventDefault();
    ctx.onClose();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    ctx.onOpen();
    ctx.onMove(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    ctx.onMove(-1);
    return;
  }
  if (event.key === "Enter" && ctx.results.length > 0) {
    const target = ctx.activeOption ?? ctx.results[0];
    if (target !== undefined) {
      event.preventDefault();
      ctx.onChoose(target.symbol);
    }
  }
}

function isFocusInside(event: FocusEvent<HTMLDivElement>): boolean {
  const next = event.relatedTarget;
  return next instanceof Node && event.currentTarget.contains(next);
}

function useSearchPanelState() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const returnFocusRef = useRef(false);

  const closeAll = () => {
    setOpen(false);
    setSheetOpen(false);
    setActiveIndex(-1);
  };
  const closeSheet = () => {
    returnFocusRef.current = true;
    closeAll();
  };
  const openSheet = () => {
    returnFocusRef.current = false;
    setSheetOpen(true);
    setOpen(true);
  };
  const selectResult = () => {
    returnFocusRef.current = false;
    closeAll();
    setQuery("");
  };
  const changeQuery = (value: string) => {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
  };
  const clearQuery = () => {
    setQuery("");
    setActiveIndex(-1);
  };
  const moveActive = (delta: 1 | -1, count: number) =>
    setActiveIndex((prev) => nextIndex(prev, delta, count));
  const blurDropdown = (event: FocusEvent<HTMLDivElement>, modalSheet: boolean) => {
    if (!isFocusInside(event) && !modalSheet) {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return {
    query,
    open,
    sheetOpen,
    activeIndex,
    returnFocusRef,
    setOpen,
    closeAll,
    closeSheet,
    openSheet,
    selectResult,
    changeQuery,
    clearQuery,
    moveActive,
    blurDropdown,
  };
}

export function HeaderSearch() {
  const router = useRouter();
  const baseId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { stockHref } = useListNavigation();
  const isDesktop = useMediaQuery("(width >= 48rem)");
  const panel = useSearchPanelState();
  const search = useSearch(panel.query);
  const watchlist = useWatchlist();
  const choose = useResultChoice(search, panel.selectResult);
  const modalSheet = panel.sheetOpen && !isDesktop;
  const optionId = (symbol: string) => `${baseId}-option-${symbol}`;
  const validIndex =
    panel.activeIndex >= 0 && panel.activeIndex < search.results.length ? panel.activeIndex : -1;
  const activeOption = validIndex >= 0 ? search.results[validIndex] : undefined;
  const activeOptionId = activeOption ? optionId(activeOption.symbol) : undefined;

  useScrollActiveOption(containerRef, activeOptionId);
  useModalDialog({
    open: modalSheet,
    dialogRef: containerRef,
    initialFocusRef: inputRef,
    returnFocusRef: triggerRef,
    shouldReturnFocusRef: panel.returnFocusRef,
    onEscape: panel.closeSheet,
  });

  return (
    <SearchView
      stockHref={stockHref}
      containerRef={containerRef}
      inputRef={inputRef}
      triggerRef={triggerRef}
      listboxId={`${baseId}-listbox`}
      optionId={optionId}
      activeOptionId={activeOptionId}
      query={panel.query}
      activeQuery={search.query}
      status={search.status}
      isFetching={search.isFetching}
      results={search.results}
      activeIndex={validIndex}
      panelOpen={panel.open}
      sheetOpen={modalSheet}
      isWatchlistLoaded={watchlist.isLoaded}
      isStarred={watchlist.isStarred}
      onQueryChange={panel.changeQuery}
      onClear={() => {
        panel.clearQuery();
        inputRef.current?.focus();
      }}
      onFocus={() => panel.setOpen(true)}
      onKeyDown={(event) =>
        handleSearchKeyDown(event, {
          results: search.results,
          activeOption,
          onOpen: () => panel.setOpen(true),
          onClose: modalSheet ? panel.closeSheet : panel.closeAll,
          onMove: (delta) => panel.moveActive(delta, search.results.length),
          onChoose: (symbol) => {
            choose(symbol);
            router.push(stockHref(symbol));
          },
        })
      }
      onContainerBlur={(event) => panel.blurDropdown(event, modalSheet)}
      onOpenSheet={panel.openSheet}
      onCloseSheet={panel.closeSheet}
      onSelect={choose}
      onToggleStar={watchlist.toggle}
      onRetry={search.retry}
    />
  );
}

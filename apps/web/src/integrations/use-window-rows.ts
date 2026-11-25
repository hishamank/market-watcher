import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState, type RefObject } from "react";

const ROW_ESTIMATE_PX = 68;
const OVERSCAN_ROWS = 5;
const SERVER_RECT = { width: 1440, height: 900 };

export interface WindowRow {
  readonly index: number;
  readonly key: string;
}

export interface WindowRows {
  readonly rows: readonly WindowRow[];
  readonly paddingStart: number;
  readonly paddingEnd: number;
  readonly listRef: RefObject<HTMLUListElement | null>;
  readonly measureRow: (node: Element | null) => void;
}

function useListOffset(listRef: RefObject<HTMLUListElement | null>): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const measure = () => {
      const node = listRef.current;
      if (node !== null) setOffset(node.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [listRef]);
  return offset;
}

export function useWindowRows(keys: readonly string[]): WindowRows {
  "use no memo";
  const listRef = useRef<HTMLUListElement>(null);
  const scrollMargin = useListOffset(listRef);
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useWindowVirtualizer({
    count: keys.length,
    estimateSize: () => ROW_ESTIMATE_PX,
    getItemKey: (index) => keys[index] ?? index,
    overscan: OVERSCAN_ROWS,
    initialRect: SERVER_RECT,
    initialOffset: 0,
    scrollMargin,
  });
  const items = virtualizer.getVirtualItems();
  const first = items[0];
  const last = items.at(-1);
  const total = virtualizer.getTotalSize();
  return {
    rows: items.map((item) => ({ index: item.index, key: String(item.key) })),
    paddingStart: first === undefined ? 0 : first.start - scrollMargin,
    paddingEnd: last === undefined ? 0 : total - (last.end - scrollMargin),
    listRef,
    measureRow: virtualizer.measureElement,
  };
}

"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  DEFAULT_TABLE_COLUMNS,
  LOCKED_TABLE_COLUMNS,
  TABLE_COLUMNS,
  type TableColumn,
  type TableColumnsSnapshot,
  type TableColumnsStore,
  toggleColumn,
} from "./table-columns-store.ts";
export const TableColumnsContext = createContext<TableColumnsStore | null>(null);

export type { TableColumn } from "./table-columns-store.ts";

export interface TableColumnsResult {
  readonly all: readonly TableColumn[];
  readonly chosen: readonly TableColumn[] | undefined;
  readonly isLoaded: boolean;
  readonly isLocked: (column: TableColumn) => boolean;
  readonly toggle: (column: TableColumn, shown: readonly TableColumn[]) => void;
  readonly reset: () => void;
}

function getServerSnapshot(): TableColumnsSnapshot {
  return DEFAULT_TABLE_COLUMNS;
}

export function useTableColumns(): TableColumnsResult {
  const store = useContext(TableColumnsContext);
  if (store === null) throw new Error("useTableColumns requires the web table columns provider");
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLocked = (column: TableColumn) => LOCKED_TABLE_COLUMNS.includes(column);

  return {
    all: TABLE_COLUMNS,
    chosen: snapshot.columns,
    isLoaded: snapshot.loaded,
    isLocked,
    toggle: (column, shown) => store.choose(toggleColumn(shown, column)),
    reset: () => store.reset(),
  };
}

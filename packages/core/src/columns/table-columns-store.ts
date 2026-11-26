import type { KeyValueStore } from "../platform/key-value-store.ts";

export const TABLE_COLUMNS_STORAGE_KEY = "table-columns:v1";

export const TABLE_COLUMNS = [
  "name",
  "symbol",
  "price",
  "change",
  "changePercent",
  "previousClose",
  "dayHigh",
  "dayLow",
  "lastUpdate",
] as const;

export type TableColumn = (typeof TABLE_COLUMNS)[number];

export const LOCKED_TABLE_COLUMNS: readonly TableColumn[] = ["name", "price"];

export interface TableColumnsSnapshot {
  readonly columns: readonly TableColumn[] | undefined;
  readonly loaded: boolean;
}

export interface TableColumnsStore {
  getSnapshot(): TableColumnsSnapshot;
  subscribe(listener: () => void): () => void;
  choose(columns: readonly TableColumn[]): void;
  reset(): void;
}

export const DEFAULT_TABLE_COLUMNS: TableColumnsSnapshot = { columns: undefined, loaded: false };

const isTableColumn = (value: unknown): value is TableColumn =>
  TABLE_COLUMNS.some((column) => column === value);

export function normaliseColumns(columns: readonly TableColumn[]): readonly TableColumn[] {
  return TABLE_COLUMNS.filter(
    (column) => LOCKED_TABLE_COLUMNS.includes(column) || columns.includes(column),
  );
}

export function toggleColumn(
  shown: readonly TableColumn[],
  column: TableColumn,
): readonly TableColumn[] {
  if (LOCKED_TABLE_COLUMNS.includes(column)) return normaliseColumns(shown);
  const next = shown.includes(column)
    ? shown.filter((item) => item !== column)
    : [...shown, column];
  return normaliseColumns(next);
}

export function parseTableColumns(raw: string | null): readonly TableColumn[] | undefined {
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? normaliseColumns(value.filter(isTableColumn)) : undefined;
  } catch {
    return undefined;
  }
}

export function createTableColumnsStore(storage: KeyValueStore): TableColumnsStore {
  const listeners = new Set<() => void>();
  let snapshot = DEFAULT_TABLE_COLUMNS;
  let queue: Promise<void> = Promise.resolve();
  let stopStorage: (() => void) | null = null;

  const publish = (columns: readonly TableColumn[] | undefined): void => {
    snapshot = { columns, loaded: true };
    for (const listener of Array.from(listeners)) listener();
  };
  const enqueue = (task: () => Promise<void>): void => {
    queue = queue.then(task).catch(() => {});
  };
  const read = (): void =>
    enqueue(async () => {
      const raw = await storage.getItem(TABLE_COLUMNS_STORAGE_KEY).catch(() => null);
      publish(parseTableColumns(raw));
    });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      if (stopStorage === null) {
        stopStorage = storage.subscribe((key) => {
          if (key === TABLE_COLUMNS_STORAGE_KEY) read();
        });
        read();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && stopStorage !== null) {
          stopStorage();
          stopStorage = null;
        }
      };
    },
    choose(columns) {
      const chosen = normaliseColumns(columns);
      publish(chosen);
      enqueue(() => storage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(chosen)));
    },
    reset() {
      publish(undefined);
      enqueue(() => storage.removeItem(TABLE_COLUMNS_STORAGE_KEY));
    },
  };
}

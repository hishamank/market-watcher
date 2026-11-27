import type { TableColumn } from "../columns/table-columns-store.ts";
import type { CSSProperties } from "react";

const NAME_MIN_PX = 220;
const STAR_PX = 44;
const GAP_PX = 16;
const PADDING_PX = 8;

const WIDTHS: Record<Exclude<TableColumn, "name">, number> = {
  symbol: 88,
  price: 110,
  change: 128,
  changePercent: 96,
  previousClose: 124,
  dayHigh: 104,
  dayLow: 104,
  lastUpdate: 124,
};

const COMPACT: readonly TableColumn[] = ["name", "symbol", "price", "change"];
const TABLE: readonly TableColumn[] = [...COMPACT, "changePercent", "previousClose", "lastUpdate"];
const WIDE: readonly TableColumn[] = [...TABLE, "dayHigh", "dayLow"];

export function defaultColumns(table: boolean, wide: boolean): readonly TableColumn[] {
  if (wide) return WIDE;
  return table ? TABLE : COMPACT;
}

export function customColumnStyle(columns: readonly TableColumn[]): CSSProperties {
  const tracks = columns.map((column) =>
    column === "name" ? `minmax(${NAME_MIN_PX}px,1fr)` : `${WIDTHS[column]}px`,
  );
  const width = columns.reduce(
    (sum, column) => sum + (column === "name" ? NAME_MIN_PX : WIDTHS[column]) + GAP_PX,
    STAR_PX + PADDING_PX,
  );
  const shown = Object.fromEntries(
    Object.keys(WIDTHS).map((column) => [
      `--col-${column}`,
      columns.includes(column as TableColumn) ? "block" : "none",
    ]),
  );
  return {
    ...shown,
    "--col-pill-percent": columns.includes("changePercent") ? "none" : "inline",
    "--table-cols": [...tracks, `${STAR_PX}px`].join(" "),
    "--table-span": String(columns.length),
    "--table-min": `${width}px`,
  } as CSSProperties;
}

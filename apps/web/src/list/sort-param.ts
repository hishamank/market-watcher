import { STOCK_SORT_FIELDS, type StockSort, type StockSortField } from "@mini/core";

const isField = (value: string): value is StockSortField =>
  STOCK_SORT_FIELDS.some((field) => field === value);

export function parseSortParam(value: string | null): StockSort | undefined {
  const [field = "", direction] = (value ?? "").split("-");
  if (!isField(field) || (direction !== "asc" && direction !== "desc")) return undefined;
  return { field, direction };
}

export function sortParamValue(sort: StockSort): string {
  return `${sort.field}-${sort.direction}`;
}

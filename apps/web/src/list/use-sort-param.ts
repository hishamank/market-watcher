import { nextStockSort, type StockSort, type StockSortField } from "@mini/core";
import { useSearchParams } from "next/navigation";
import { parseSortParam, sortParamValue } from "./sort-param.ts";

export interface SortParam {
  readonly sort: StockSort | undefined;
  readonly selectSort: (field: StockSortField) => void;
}

export function useSortParam(): SortParam {
  const searchParams = useSearchParams();
  const sort = parseSortParam(searchParams.get("sort"));
  return {
    sort,
    selectSort: (field) => {
      const next = nextStockSort(sort, field);
      const params = new URLSearchParams(searchParams.toString());
      if (next === undefined) params.delete("sort");
      else params.set("sort", sortParamValue(next));
      window.history.pushState(null, "", `/?${params.toString()}`);
    },
  };
}

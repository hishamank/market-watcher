import { useSearchParams } from "next/navigation";
import { parseSortParam, sortParamValue } from "../list/sort-param.ts";

function listQuery(view: string | null, sortValue: string | null): string {
  if (view !== "watchlist") return "";
  const sort = parseSortParam(sortValue);
  return sort === undefined ? "?view=watchlist" : `?view=watchlist&sort=${sortParamValue(sort)}`;
}

export function useListNavigation() {
  const searchParams = useSearchParams();
  const query = listQuery(searchParams.get("view"), searchParams.get("sort"));
  return {
    listHref: `/${query}`,
    stockHref: (symbol: string) => `/stocks/${symbol}${query}`,
  };
}

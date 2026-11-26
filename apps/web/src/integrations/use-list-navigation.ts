import { useSearchParams } from "next/navigation";

export function useListNavigation() {
  const watchlist = useSearchParams().get("view") === "watchlist";
  return {
    listHref: watchlist ? "/?view=watchlist" : "/",
    stockHref: (symbol: string) => `/stocks/${symbol}${watchlist ? "?view=watchlist" : ""}`,
  };
}

import { useTrack } from "@mini/analytics";
import type { SearchResult } from "@mini/core";

export function useResultChoice(
  search: SearchResult,
  onChosen: () => void,
): (symbol: string) => void {
  const track = useTrack();
  return (symbol) => {
    track({
      name: "search_result_selected",
      queryLength: search.query.length,
      resultCount: search.results.length,
      position: search.results.findIndex((match) => match.symbol === symbol),
    });
    onChosen();
  };
}

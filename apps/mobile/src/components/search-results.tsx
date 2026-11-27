import type { SearchMatch } from "@mini/contracts";
import { type SearchResult, useT } from "@mini/core";
import { FlatList } from "react-native";
import { SearchResultRow } from "./search-result-row.tsx";
import { SearchMessage, SearchSkeleton } from "./search-states.tsx";

export interface SearchResultsProps {
  status: SearchResult["status"];
  query: string;
  results: readonly SearchMatch[];
  starred: (symbol: string) => boolean | undefined;
  onOpen: (symbol: string) => void;
  onToggleStar: (symbol: string) => void;
  onRetry: () => void;
}

export function SearchResults(props: SearchResultsProps) {
  const t = useT();
  const { status, query, results } = props;
  if (status === "idle") {
    return (
      <SearchMessage
        testID="search-idle"
        icon="search"
        title={t("search.idle.title")}
        help={t("search.idle.help")}
      />
    );
  }
  if (status === "loading") return <SearchSkeleton />;
  if (status === "error") {
    return (
      <SearchMessage
        testID="search-error"
        icon="alert"
        title={t("search.error.title")}
        help={t("search.error.help")}
        action={{ label: t("search.error.retry"), testID: "search-retry", onPress: props.onRetry }}
      />
    );
  }
  if (results.length === 0) {
    return (
      <SearchMessage
        testID="search-no-results"
        icon="search"
        title={t("search.noResults.title", { query })}
        help={t("search.noResults.help")}
      />
    );
  }
  return (
    <FlatList<SearchMatch>
      testID="search-results"
      accessibilityLabel={t("search.resultsCount", { count: results.length })}
      data={results}
      keyExtractor={(match) => match.symbol}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      renderItem={({ item }) => (
        <SearchResultRow
          match={item}
          starred={props.starred(item.symbol)}
          onOpen={() => props.onOpen(item.symbol)}
          onToggleStar={() => props.onToggleStar(item.symbol)}
        />
      )}
    />
  );
}

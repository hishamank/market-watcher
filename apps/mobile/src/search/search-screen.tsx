import { useTrack } from "@mini/analytics";
import { useLanguage, useSearch, useWatchlist } from "@mini/core";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchField } from "../components/search-field.tsx";
import { SearchResults } from "../components/search-results.tsx";
import { ConnectedBanner } from "../shell/connected-banner.tsx";
import { usePalette } from "../theme/palette.ts";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const search = useSearch(query);
  const watchlist = useWatchlist();
  const router = useRouter();
  const track = useTrack();
  const { direction } = useLanguage();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      testID="search-screen"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { paddingBlockStart: insets.top, backgroundColor: palette.surface }]}
    >
      <SearchField
        query={query}
        isFetching={search.isFetching}
        rtl={direction === "rtl"}
        onChangeQuery={setQuery}
        onClear={() => setQuery("")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />
      <ConnectedBanner />
      <SearchResults
        status={search.status}
        query={search.query}
        results={search.results}
        starred={(symbol) => (watchlist.isLoaded ? watchlist.isStarred(symbol) : undefined)}
        onOpen={(symbol) => {
          track({
            name: "search_result_selected",
            queryLength: search.query.length,
            resultCount: search.results.length,
            position: search.results.findIndex((match) => match.symbol === symbol),
          });
          router.push(`/stocks/${symbol}`);
        }}
        onToggleStar={watchlist.toggle}
        onRetry={search.retry}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });

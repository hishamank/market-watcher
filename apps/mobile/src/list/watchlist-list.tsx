import { useT, useWatchlist } from "@mini/core";
import { useRouter } from "expo-router";
import { FlatList } from "react-native";
import { EmptyState } from "../components/empty-state.tsx";
import { ListSkeleton, SkeletonRow } from "../components/skeleton.tsx";
import { WatchlistErrorRow } from "../components/watchlist-error-row.tsx";
import { ConnectedStockRow } from "./connected-stock-row.tsx";
import { useWatchlistStocks } from "./use-watchlist-stocks.ts";

export function WatchlistList() {
  const t = useT();
  const router = useRouter();
  const { isLoaded, symbols, toggle } = useWatchlist();
  const rows = useWatchlistStocks(symbols, isLoaded);
  if (!isLoaded) {
    return <ListSkeleton testID="watchlist-skeleton" />;
  }
  if (symbols.length === 0) {
    return (
      <EmptyState
        testID="watchlist-empty"
        icon="☆"
        title={t("watchlist.empty.title")}
        help={t("watchlist.empty.help")}
        actionLabel={t("watchlist.empty.action")}
        actionTestID="watchlist-empty-action"
        onAction={() => router.navigate("/")}
      />
    );
  }
  return (
    <FlatList
      testID="watchlist"
      data={rows}
      keyExtractor={(row) => row.symbol}
      renderItem={({ item }) =>
        item.stock !== undefined ? (
          <ConnectedStockRow stock={item.stock} testID={`watchlist-row-${item.symbol}`} />
        ) : item.loading ? (
          <SkeletonRow />
        ) : (
          <WatchlistErrorRow
            symbol={item.symbol}
            onRetry={item.retry}
            onToggleStar={() => toggle(item.symbol)}
          />
        )
      }
    />
  );
}

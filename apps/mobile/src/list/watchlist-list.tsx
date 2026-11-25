import { useStock, useT, useWatchlist } from "@mini/core";
import { useRouter } from "expo-router";
import { FlatList } from "react-native";
import { EmptyState } from "../components/empty-state.tsx";
import { ListSkeleton, SkeletonRow } from "../components/skeleton.tsx";
import { WatchlistErrorRow } from "../components/watchlist-error-row.tsx";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

function WatchlistRow({ symbol, onToggleStar }: { symbol: string; onToggleStar: () => void }) {
  const stock = useStock(symbol);
  if (stock.data !== undefined) {
    return <ConnectedStockRow stock={stock.data.stock} testID={`watchlist-row-${symbol}`} />;
  }
  if (stock.isError) {
    return (
      <WatchlistErrorRow
        symbol={symbol}
        onRetry={() => void stock.refetch()}
        onToggleStar={onToggleStar}
      />
    );
  }
  return <SkeletonRow />;
}

export function WatchlistList() {
  const t = useT();
  const router = useRouter();
  const { isLoaded, symbols, toggle } = useWatchlist();
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
      data={symbols}
      keyExtractor={(symbol) => symbol}
      renderItem={({ item }) => <WatchlistRow symbol={item} onToggleStar={() => toggle(item)} />}
    />
  );
}

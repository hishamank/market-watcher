import { useT, useWatchlist } from "@mini/core";
import { useRouter } from "expo-router";
import { duration } from "@mini/tokens";
import { FlatList, StyleSheet } from "react-native";
import Animated, { FadeIn, LayoutAnimationConfig } from "react-native-reanimated";
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
  return (
    <LayoutAnimationConfig skipEntering>
      {symbols.length === 0 ? (
        <Animated.View key="empty" entering={swap} style={styles.fill}>
          <EmptyState
            testID="watchlist-empty"
            icon="☆"
            title={t("watchlist.empty.title")}
            help={t("watchlist.empty.help")}
            actionLabel={t("watchlist.empty.action")}
            actionTestID="watchlist-empty-action"
            onAction={() => router.navigate("/")}
            popIcon
          />
        </Animated.View>
      ) : (
        <Animated.View key="list" entering={swap} style={styles.fill}>
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
        </Animated.View>
      )}
    </LayoutAnimationConfig>
  );
}

const swap = FadeIn.duration(duration.base);

const styles = StyleSheet.create({ fill: { flex: 1 } });

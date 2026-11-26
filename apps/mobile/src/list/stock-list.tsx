import type { Stock } from "@mini/contracts";
import { type StockPagesResult, useStockPages } from "@mini/core";
import { FlatList } from "react-native";
import { ListError } from "../components/list-error.tsx";
import { ListMoreError } from "../components/list-more-error.tsx";
import { ListSkeleton, SkeletonRow } from "../components/skeleton.tsx";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

const VISIBLE_SCREENS_MOUNTED = 3;
const END_REACHED_SCREENS = 1;

function ListFooter({ list }: { list: StockPagesResult }) {
  if (list.loadMoreFailed) return <ListMoreError onRetry={list.retry} />;
  return list.isLoadingMore ? <SkeletonRow /> : null;
}

export function StockList() {
  const list = useStockPages();
  if (list.stocks !== undefined) {
    return (
      <FlatList<Stock>
        testID="stock-list"
        data={list.stocks}
        keyExtractor={(stock) => stock.symbol}
        renderItem={({ item }) => (
          <ConnectedStockRow stock={item} testID={`stock-row-${item.symbol}`} />
        )}
        initialNumToRender={12}
        windowSize={VISIBLE_SCREENS_MOUNTED}
        onEndReached={list.loadMore}
        onEndReachedThreshold={END_REACHED_SCREENS}
        ListFooterComponent={<ListFooter list={list} />}
      />
    );
  }
  if (list.isError) {
    return <ListError onRetry={list.retry} />;
  }
  return <ListSkeleton testID="list-skeleton" />;
}

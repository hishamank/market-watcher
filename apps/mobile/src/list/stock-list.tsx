import type { Stock } from "@mini/contracts";
import { useStockList } from "@mini/core";
import { FlatList } from "react-native";
import { ListError } from "../components/list-error.tsx";
import { ListSkeleton } from "../components/skeleton.tsx";
import { ConnectedStockRow } from "./connected-stock-row.tsx";

const VISIBLE_SCREENS_MOUNTED = 3;

export function StockList() {
  const list = useStockList();
  if (list.data !== undefined) {
    return (
      <FlatList<Stock>
        testID="stock-list"
        data={list.data.stocks}
        keyExtractor={(stock) => stock.symbol}
        renderItem={({ item }) => (
          <ConnectedStockRow stock={item} testID={`stock-row-${item.symbol}`} />
        )}
        initialNumToRender={12}
        windowSize={VISIBLE_SCREENS_MOUNTED}
      />
    );
  }
  if (list.isError) {
    return <ListError onRetry={() => void list.refetch()} />;
  }
  return <ListSkeleton testID="list-skeleton" />;
}

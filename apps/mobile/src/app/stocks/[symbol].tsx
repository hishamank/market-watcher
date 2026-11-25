import { useLocalSearchParams } from "expo-router";
import { DetailPlaceholder } from "../../detail/detail-placeholder.tsx";

export default function StockDetailRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return <DetailPlaceholder symbol={symbol} />;
}

import { ConnectedBanner } from "../../shell/connected-banner.tsx";
import { ConnectedStatusStrip } from "../../shell/connected-status-strip.tsx";
import { useLocalSearchParams } from "expo-router";
import { DetailScreen } from "../../detail/detail-screen.tsx";

export default function StockDetailRoute() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  return (
    <>
      <ConnectedStatusStrip />
      <ConnectedBanner />
      <DetailScreen symbol={symbol} />
    </>
  );
}

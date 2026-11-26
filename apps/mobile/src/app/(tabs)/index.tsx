import { ConnectedBanner } from "../../shell/connected-banner.tsx";
import { StockList } from "../../list/stock-list.tsx";

export default function MarketsRoute() {
  return (
    <>
      <ConnectedBanner />
      <StockList />
    </>
  );
}

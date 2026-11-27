import { ConnectedBanner } from "../../shell/connected-banner.tsx";
import { ConnectedStatusStrip } from "../../shell/connected-status-strip.tsx";
import { StockList } from "../../list/stock-list.tsx";

export default function MarketsRoute() {
  return (
    <>
      <ConnectedStatusStrip />
      <ConnectedBanner />
      <StockList />
    </>
  );
}

import { ConnectedBanner } from "../../shell/connected-banner.tsx";
import { ConnectedStatusStrip } from "../../shell/connected-status-strip.tsx";
import { WatchlistList } from "../../list/watchlist-list.tsx";

export default function WatchlistRoute() {
  return (
    <>
      <ConnectedStatusStrip />
      <ConnectedBanner />
      <WatchlistList />
    </>
  );
}

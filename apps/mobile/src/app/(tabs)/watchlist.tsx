import { ConnectedBanner } from "../../shell/connected-banner.tsx";
import { WatchlistList } from "../../list/watchlist-list.tsx";

export default function WatchlistRoute() {
  return (
    <>
      <ConnectedBanner />
      <WatchlistList />
    </>
  );
}

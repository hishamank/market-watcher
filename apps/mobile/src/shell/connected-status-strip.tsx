import { useFeedMode, useMarketStatus, useT } from "@mini/core";
import { FeedModeBadge } from "../components/feed-mode-badge.tsx";
import { MarketClosedLabel } from "../components/market-closed-label.tsx";
import { StatusStrip } from "../components/status-strip.tsx";
import { usePalette } from "../theme/palette.ts";

export function ConnectedStatusStrip() {
  const feedMode = useFeedMode();
  const marketStatus = useMarketStatus();
  const t = useT();
  const palette = usePalette();
  return (
    <StatusStrip palette={palette}>
      {feedMode === null ? null : (
        <FeedModeBadge
          live={feedMode === "live"}
          label={t(feedMode === "live" ? "feedMode.live" : "feedMode.simulated")}
          palette={palette}
        />
      )}
      {marketStatus === "closed" ? (
        <MarketClosedLabel label={t("marketStatus.closed")} palette={palette} />
      ) : null}
    </StatusStrip>
  );
}

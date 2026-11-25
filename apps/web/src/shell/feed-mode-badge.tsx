import type { FeedMode } from "@mini/contracts";
import { useT } from "../i18n/use-t.ts";

export function FeedModeBadge({ feedMode }: { feedMode: FeedMode }) {
  const t = useT();
  const live = feedMode === "live";
  return (
    <span
      data-testid="feed-mode-badge"
      className={`inline-flex items-center gap-6 rounded-pill border border-border-strong px-10 py-2 text-caption font-medium text-text-secondary ${live ? "border-solid" : "border-dashed"}`}
    >
      <span
        aria-hidden="true"
        className={`size-[7px] rounded-full border-[1.5px] border-current ${live ? "bg-current" : ""}`}
      />
      {t(live ? "feedMode.live" : "feedMode.simulated")}
    </span>
  );
}

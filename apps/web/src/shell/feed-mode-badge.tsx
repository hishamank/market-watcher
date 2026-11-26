import type { FeedMode } from "@mini/contracts";
import { useT } from "@mini/core";

export function FeedModeBadge({ feedMode }: { feedMode: FeedMode }) {
  const t = useT();
  const live = feedMode === "live";
  return (
    <span
      data-testid="feed-mode-badge"
      className={`inline-flex items-center gap-6 text-caption font-medium whitespace-nowrap text-text-secondary xl:rounded-pill xl:border xl:border-border-strong xl:px-10 xl:py-2 ${live ? "xl:border-solid" : "xl:border-dashed"}`}
    >
      <span
        aria-hidden="true"
        className={`size-[7px] rounded-full border-[1.5px] border-current ${live ? "bg-current" : ""}`}
      />
      {t(live ? "feedMode.live" : "feedMode.simulated")}
    </span>
  );
}

import type { FeedMode } from "@mini/contracts";
import { useT } from "@mini/core";
import { useId } from "react";

export function FeedModeBadge({ feedMode }: { feedMode: FeedMode }) {
  const t = useT();
  const tooltipId = useId();
  const live = feedMode === "live";
  return (
    <span
      tabIndex={live ? undefined : 0}
      aria-describedby={live ? undefined : tooltipId}
      className="group relative inline-flex rounded-pill outline-offset-2"
    >
      <span
        data-testid="feed-mode-badge"
        className={`inline-flex items-center gap-6 text-caption font-medium whitespace-nowrap text-text-secondary xl:rounded-pill xl:border xl:border-border-strong xl:px-10 xl:py-2 ${live ? "xl:border-solid" : "xl:border-dashed cursor-help"}`}
      >
        <span
          aria-hidden="true"
          className={`size-[7px] rounded-full border-[1.5px] border-current ${live ? "bg-current" : ""}`}
        />
        {t(live ? "feedMode.live" : "feedMode.simulated")}
      </span>
      {live ? null : (
        <span
          id={tooltipId}
          role="tooltip"
          className="invisible absolute start-0 top-full z-50 mt-8 w-[280px] rounded-lg border border-border bg-raised p-12 text-text shadow-2 opacity-0 transition-opacity duration-(--duration-fast) group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100"
        >
          <span className="block text-caption font-medium">{t("feedMode.simulated.title")}</span>
          <span className="mt-4 block text-caption leading-relaxed text-text-secondary">
            {t("feedMode.simulated.help")}
          </span>
        </span>
      )}
    </span>
  );
}

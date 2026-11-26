import { useT, type ConnectionStatus } from "@mini/core";
import { Button } from "../components/button.tsx";
import { OfflineIcon, ReconnectIcon } from "../components/icons.tsx";

export type BannerStatus = Extract<ConnectionStatus, "stale" | "offline">;

export interface ConnectionBannerProps {
  status: BannerStatus | undefined;
  open: boolean;
  onRetry: () => void;
}

function StaleBanner({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div
      data-testid="connection-banner"
      className="flex min-h-[56px] items-center gap-10 bg-stale-tint py-6 ps-14 pe-6 text-label font-normal md:px-24"
    >
      <ReconnectIcon className="text-stale motion-safe:animate-spin" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("connection.stale.title")}</p>
        <p className="text-text-secondary">{t("connection.stale.help")}</p>
      </div>
      <Button testId="connection-retry" onClick={onRetry} compact>
        {t("connection.retry")}
      </Button>
    </div>
  );
}

function OfflineBanner() {
  const t = useT();
  return (
    <div
      data-testid="connection-banner"
      className="flex min-h-[56px] items-center gap-10 bg-fill px-14 py-6 text-label font-normal md:px-24"
    >
      <OfflineIcon className="text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("connection.offline.title")}</p>
        <p className="text-text-secondary">{t("connection.offline.help")}</p>
      </div>
    </div>
  );
}

export function ConnectionBanner({ status, open, onRetry }: ConnectionBannerProps) {
  const shown = open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-(--duration-base) motion-safe:ease-standard ${shown}`}
    >
      <div className="min-h-0 overflow-hidden">
        {status === "stale" ? <StaleBanner onRetry={onRetry} /> : null}
        {status === "offline" ? <OfflineBanner /> : null}
      </div>
    </div>
  );
}

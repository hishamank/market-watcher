import { useT, type ConnectionStatus } from "@mini/core";
import { Button } from "../components/button.tsx";
import { OfflineIcon, ReconnectIcon } from "../components/icons.tsx";

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  onRetry: () => void;
}

function StaleBanner({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div
      data-testid="connection-banner"
      className="flex min-h-[56px] items-center gap-10 bg-stale-tint py-6 ps-14 pe-6 text-label font-normal motion-safe:animate-banner-in md:px-24"
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
      className="flex min-h-[56px] items-center gap-10 bg-fill px-14 py-6 text-label font-normal motion-safe:animate-banner-in md:px-24"
    >
      <OfflineIcon className="text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("connection.offline.title")}</p>
        <p className="text-text-secondary">{t("connection.offline.help")}</p>
      </div>
    </div>
  );
}

export function ConnectionBanner({ status, onRetry }: ConnectionBannerProps) {
  return (
    <div role="status" aria-live="polite" className="overflow-hidden">
      {status === "stale" ? <StaleBanner onRetry={onRetry} /> : null}
      {status === "offline" ? <OfflineBanner /> : null}
    </div>
  );
}

import { useT, useWatchlist } from "@mini/core";
import { Button } from "../components/button.tsx";

export function WatchlistError() {
  const t = useT();
  const { saveFailed, dismissError } = useWatchlist();
  return (
    <div aria-live="assertive" aria-atomic="true">
      {saveFailed ? (
        <div className="flex items-center justify-between gap-12 border-b border-border bg-raised px-16 py-8 text-text">
          <p>{t("watchlist.toast.error")}</p>
          <Button onClick={dismissError}>{t("watchlist.toast.dismiss")}</Button>
        </div>
      ) : null}
    </div>
  );
}

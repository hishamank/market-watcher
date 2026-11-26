import { useT, type StockEarningsView } from "@mini/core";
import { Skeleton } from "./skeleton.tsx";
import { EarningsContent } from "./earnings-content.tsx";

export function StockEarnings({ view }: { view: StockEarningsView }) {
  const t = useT();
  if (view.status === "empty") return null;
  return (
    <section
      data-testid="stock-earnings"
      data-state={view.status}
      aria-labelledby="earnings-title"
      className="mx-16 mt-24 border-t border-border pt-24 md:mx-0 md:rounded-xl md:border md:bg-surface md:p-24 md:shadow-1"
    >
      <h2 id="earnings-title" className="text-heading-md">
        {t("earnings.title")}
      </h2>
      {view.status === "ready" ? (
        <EarningsContent view={view} />
      ) : view.status === "loading" ? (
        <div role="status" className="mt-20">
          <span className="sr-only">{t("earnings.loading")}</span>
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : (
        <div className="mt-12 text-body text-text-secondary">
          <p>{t("earnings.error")}</p>
          <button
            type="button"
            data-testid="earnings-retry"
            onClick={view.retry}
            className="mt-8 min-h-[44px] rounded-xs text-label underline underline-offset-4 hover:text-accent"
          >
            {t("profile.retry")}
          </button>
        </div>
      )}
    </section>
  );
}

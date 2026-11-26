import { useT, type StockStatisticsView } from "@mini/core";
import { Skeleton } from "./skeleton.tsx";
import { StatisticsContent } from "./statistics-content.tsx";

export function StockStatistics({ view }: { view: StockStatisticsView }) {
  const t = useT();
  if (view.status === "empty") return null;
  return (
    <section
      data-testid="stock-statistics"
      data-state={view.status}
      aria-labelledby="statistics-title"
      className="mx-16 mt-24 border-t border-border pt-24 md:mx-0 md:rounded-xl md:border md:bg-surface md:p-24 md:shadow-1"
    >
      <h2 id="statistics-title" className="text-heading-md">
        {t("statistics.title")}
      </h2>
      {view.status === "ready" ? (
        <StatisticsContent view={view} />
      ) : view.status === "loading" ? (
        <div role="status" className="mt-20 grid grid-cols-2 gap-24 md:grid-cols-3">
          <span className="sr-only">{t("statistics.loading")}</span>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-[58px] w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-12 text-body text-text-secondary">
          <p>{t("statistics.error")}</p>
          {view.status === "error" && (
            <button
              type="button"
              data-testid="statistics-retry"
              onClick={view.retry}
              className="mt-8 min-h-[44px] rounded-xs text-label underline underline-offset-4 hover:text-accent"
            >
              {t("profile.retry")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

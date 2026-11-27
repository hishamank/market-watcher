import { useT, type StockNewsView } from "@mini/core";
import { Skeleton } from "./skeleton.tsx";
import { NewsContent } from "./news-content.tsx";

export interface StockNewsProps {
  view: StockNewsView;
  onOpen: (position: number) => void;
}

export function StockNews({ view, onOpen }: StockNewsProps) {
  const t = useT();
  if (view.status === "empty") return null;
  return (
    <section
      data-testid="stock-news"
      data-state={view.status}
      aria-labelledby="news-title"
      className="mx-16 mt-24 border-t border-border pt-24 md:mx-0 md:rounded-xl md:border md:bg-surface md:p-24 md:shadow-1"
    >
      <h2 id="news-title" className="text-heading-md">
        {t("news.title")}
      </h2>
      {view.status === "ready" ? (
        <NewsContent view={view} onOpen={onOpen} />
      ) : view.status === "loading" ? (
        <div role="status" className="mt-20 space-y-20">
          <span className="sr-only">{t("news.loading")}</span>
          {[0, 1, 2].map((id) => (
            <div key={id} className="space-y-8">
              <Skeleton className="h-[12px] w-1/3" />
              <Skeleton className="h-[20px] w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 text-body text-text-secondary">
          <p>{t("news.error")}</p>
          {view.status === "error" && (
            <button
              type="button"
              data-testid="news-retry"
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

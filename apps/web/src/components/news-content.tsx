import { useT, type StockNewsView } from "@mini/core";

type ReadyNews = Extract<StockNewsView, { status: "ready" }>;
type ArticleView = ReadyNews["articles"][number];

function Headline({ article }: { article: ArticleView }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="mb-8 flex flex-wrap gap-x-8 gap-y-2 text-caption text-text-muted">
          <bdi className="break-all">{article.publisher}</bdi>
          <time dateTime={article.publishedAt}>{article.publishedLabel}</time>
        </div>
        <h3
          dir="auto"
          className="break-words text-body-strong leading-relaxed text-text group-hover:text-accent"
        >
          {article.title}
        </h3>
      </div>
      {article.thumbnail && (
        <img
          src={article.thumbnail}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={article.onImageError}
          className="h-[64px] w-[80px] shrink-0 rounded-md object-cover md:h-[72px] md:w-[96px]"
        />
      )}
      {article.href && (
        <span aria-hidden="true" className="shrink-0 pt-4 text-text-muted">
          ↗
        </span>
      )}
    </>
  );
}

export function NewsContent({
  view,
  onOpen,
}: {
  view: ReadyNews;
  onOpen: (position: number) => void;
}) {
  const t = useT();
  return (
    <>
      <ul id="news-stories" className="mt-8 divide-y divide-border">
        {view.articles.map((article, position) => (
          <li key={article.id} data-testid="news-story">
            {article.href ? (
              <a
                href={article.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpen(position)}
                aria-label={t("news.external", { title: article.title })}
                className="group flex gap-12 rounded-xs py-20 md:gap-16"
              >
                <Headline article={article} />
              </a>
            ) : (
              <div className="flex gap-12 py-20 md:gap-16">
                <Headline article={article} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {view.hasMore && (
        <button
          type="button"
          data-testid="news-more"
          aria-expanded={view.expanded}
          aria-controls="news-stories"
          onClick={view.toggle}
          className="min-h-[44px] rounded-xs text-label underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          {t(view.expanded ? "news.less" : "news.more")}
        </button>
      )}
      <div
        data-testid="news-source"
        className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 text-caption text-text-muted"
      >
        {view.sourceUrl ? (
          <a
            href={view.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center rounded-xs underline underline-offset-4 hover:text-text"
          >
            {view.attribution}
          </a>
        ) : (
          <span>{view.attribution}</span>
        )}
        {view.retrieved && <span>{view.retrieved}</span>}
      </div>
    </>
  );
}

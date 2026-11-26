import { useT, type CompanyProfileView } from "@mini/core";
import { Skeleton } from "./skeleton.tsx";

function ProfileContent({ view }: { view: Extract<CompanyProfileView, { status: "ready" }> }) {
  const t = useT();
  return (
    <>
      <h2 id="company-profile-title" className="text-heading-md">
        {view.heading}
      </h2>
      <div className="mt-16 max-w-[68ch]">
        <p
          id="company-description"
          data-testid="company-description"
          dir="auto"
          className="text-body leading-[1.8] text-text-secondary"
        >
          {view.description}
        </p>
        {view.hasMore && (
          <button
            type="button"
            data-testid="company-profile-toggle"
            aria-controls="company-description"
            aria-expanded={view.expanded}
            onClick={view.toggle}
            className="mt-4 min-h-[44px] rounded-xs text-label underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent"
          >
            {t(view.expanded ? "profile.less" : "profile.more")}
          </button>
        )}
      </div>
      {(view.facts.length > 0 || view.website !== null) && (
        <dl className="mt-24 grid grid-cols-2 gap-x-24 gap-y-20 border-t border-border pt-20">
          {view.facts.map((fact) => (
            <div key={fact.id} className="min-w-0">
              <dt className="text-caption text-text-muted">{fact.label}</dt>
              <dd
                dir="auto"
                className="mt-6 break-words text-body-strong"
                data-testid={`company-profile-${fact.id}`}
              >
                {fact.value}
              </dd>
            </div>
          ))}
          {view.website && (
            <div className="min-w-0">
              <dt className="text-caption text-text-muted">{t("profile.website")}</dt>
              <dd>
                <a
                  data-testid="company-profile-website"
                  href={view.website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("profile.external", { website: view.website.label })}
                  className="inline-flex min-h-[44px] items-center gap-6 break-all rounded-xs text-body-strong underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent"
                >
                  <bdi dir="ltr">{view.website.label}</bdi>
                  <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
      <div
        data-testid="company-profile-source"
        className="mt-24 flex flex-wrap gap-x-8 gap-y-4 text-caption text-text-muted"
      >
        <span>{view.attribution}</span>
        {view.retrieved && <span>{view.retrieved}</span>}
      </div>
    </>
  );
}

export function CompanyProfile({ view }: { view: CompanyProfileView }) {
  const t = useT();
  if (view.status === "empty") return null;
  return (
    <section
      data-testid="company-profile"
      data-state={view.status}
      aria-labelledby="company-profile-title"
      className="mx-16 mt-24 border-t border-border pt-24 md:mx-0 md:rounded-xl md:border md:bg-surface md:p-24 md:shadow-1"
    >
      {view.status === "ready" ? (
        <ProfileContent view={view} />
      ) : (
        <>
          <h2 id="company-profile-title" className="text-heading-md">
            {t("profile.about")}
          </h2>
          {view.status === "loading" ? (
            <div role="status" className="mt-20 space-y-12">
              <span className="sr-only">{t("profile.loading")}</span>
              <Skeleton className="h-[14px] w-full" />
              <Skeleton className="h-[14px] w-full" />
              <Skeleton className="h-[14px] w-2/3" />
            </div>
          ) : (
            <div className="mt-12 text-body text-text-secondary">
              <p>{t("profile.error")}</p>
              {view.status === "error" && (
                <button
                  type="button"
                  data-testid="company-profile-retry"
                  onClick={view.retry}
                  className="mt-8 min-h-[44px] rounded-xs text-label underline underline-offset-4 hover:text-accent"
                >
                  {t("profile.retry")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

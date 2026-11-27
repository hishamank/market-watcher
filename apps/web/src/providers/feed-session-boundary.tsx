"use client";

import { useFeedSession, useT } from "@mini/core";
import type { ReactNode } from "react";

export function FeedSessionBoundary({ children }: { children: ReactNode }) {
  const { reloadRequired } = useFeedSession();
  const t = useT();
  if (!reloadRequired) return children;
  return (
    <main
      data-testid="feed-reload-required"
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-xl font-semibold">{t("feedChanged.title")}</h1>
      <p>{t("feedChanged.help")}</p>
      <button
        type="button"
        data-testid="feed-reload"
        onClick={() => window.location.reload()}
        className="rounded border px-4 py-2"
      >
        {t("feedChanged.reload")}
      </button>
    </main>
  );
}

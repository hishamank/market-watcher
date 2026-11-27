"use client";

import { useFeedSession, useT } from "@mini/core";
import type { ReactNode } from "react";
import { Button } from "../components/button.tsx";
import { FeedChangedIllustration } from "../components/feed-changed-illustration.tsx";
import { ReconnectIcon } from "../components/icons.tsx";

export function FeedSessionBoundary({
  children,
  pendingData,
}: {
  children: ReactNode;
  pendingData?: readonly unknown[];
}) {
  const { reloadRequired } = useFeedSession(pendingData);
  const t = useT();
  if (!reloadRequired) return children;
  return (
    <main
      data-testid="feed-reload-required"
      role="alert"
      className="flex min-h-dvh flex-col items-center justify-center px-24 py-48 text-center"
    >
      <FeedChangedIllustration />
      <h1 className="mt-32 text-heading-lg">{t("feedChanged.title")}</h1>
      <p className="mt-10 max-w-[360px] text-body text-text-secondary">{t("feedChanged.help")}</p>
      <div className="mt-32">
        <Button testId="feed-reload" variant="solid" onClick={() => window.location.reload()}>
          <ReconnectIcon />
          {t("feedChanged.reload")}
        </Button>
      </div>
    </main>
  );
}

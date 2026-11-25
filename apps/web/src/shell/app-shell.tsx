"use client";

import { useConnectionStatus, useMarketStatus } from "@mini/core";
import type { ReactNode } from "react";
import type { ShellMeta } from "../gateway/shell-meta.ts";
import { AppHeader } from "./app-header.tsx";
import { ConnectionBanner } from "./connection-banner.tsx";

export interface AppShellProps {
  meta: ShellMeta;
  children: ReactNode;
}

export function AppShell({ meta, children }: AppShellProps) {
  const { status, retryNow } = useConnectionStatus();
  const marketStatus = useMarketStatus(meta.marketStatus);
  return (
    <div
      data-testid="app-root"
      data-feed-mode={meta.feedMode ?? undefined}
      data-market-status={marketStatus ?? undefined}
      data-connection={status}
      className="flex min-h-dvh flex-col"
    >
      <AppHeader feedMode={meta.feedMode} marketStatus={marketStatus} />
      <ConnectionBanner status={status} onRetry={retryNow} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

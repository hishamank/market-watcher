"use client";

import { useConnectionStatus } from "@mini/core";
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
  return (
    <div
      data-testid="app-root"
      data-feed-mode={meta.feedMode ?? undefined}
      data-market-status={meta.marketStatus ?? undefined}
      data-connection={status}
      className="flex min-h-dvh flex-col"
    >
      <AppHeader feedMode={meta.feedMode} marketStatus={meta.marketStatus} />
      <ConnectionBanner status={status} onRetry={retryNow} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

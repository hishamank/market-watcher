"use client";

import { useColorScheme, useConnectionStatus, useMarketStatus, useT } from "@mini/core";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { ShellMeta } from "../gateway/shell-meta.ts";
import { HeaderSearch } from "../search/header-search.tsx";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { ThemeSwitch } from "../components/theme-switch.tsx";
import { AppHeader } from "./app-header.tsx";
import { ChaosPanel } from "./chaos-panel.tsx";
import { LanguageToggle } from "./language-toggle.tsx";
import { usePresence } from "../integrations/use-presence.ts";
import { ConnectionBanner, type BannerStatus } from "./connection-banner.tsx";

export interface AppShellProps {
  meta: ShellMeta;
  children: ReactNode;
}

export function AppShell({ meta, children }: AppShellProps) {
  const t = useT();
  const { scheme, toggle } = useColorScheme();
  const { status, retryNow } = useConnectionStatus();
  const marketStatus = useMarketStatus(meta.marketStatus);
  const { listHref } = useListNavigation();
  const showBack = usePathname().startsWith("/stocks/");
  const banner = usePresence<BannerStatus>(
    status === "stale" || status === "offline" ? status : undefined,
  );
  return (
    <div
      data-testid="app-root"
      data-feed-mode={meta.feedMode ?? undefined}
      data-market-status={marketStatus ?? undefined}
      data-connection={status}
      className="flex min-h-dvh flex-col"
    >
      <AppHeader
        feedMode={meta.feedMode}
        marketStatus={marketStatus}
        showBack={showBack}
        backHref={listHref}
        search={
          <>
            <HeaderSearch />
            <LanguageToggle />
          </>
        }
        themeSwitch={
          <ThemeSwitch dark={scheme === "dark"} label={t("theme.darkMode")} onToggle={toggle} />
        }
      />
      <ConnectionBanner status={banner.value} open={banner.open} onRetry={retryNow} />
      <div className="flex flex-1 flex-col">{children}</div>
      {meta.feedMode === "simulated" ? (
        <Suspense fallback={null}>
          <ChaosPanel />
        </Suspense>
      ) : null}
    </div>
  );
}

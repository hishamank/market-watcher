"use client";

import { useRouter } from "next/navigation";
import { FeedSessionBoundary } from "./feed-session-boundary.tsx";
import { CoreProvider, type Locale } from "@mini/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { switchDocumentLocale } from "../platform/document-locale.ts";
import { OfflineControlContext } from "../platform/offline-context.tsx";
import { createWebPlatform } from "../platform/web-platform.ts";
import { createQueryClient } from "../query/query-client.ts";

import type { FeedMode } from "@mini/contracts";

export interface ProvidersProps {
  gatewayUrl: string;
  initialFeedMode: FeedMode | null;
  locale: Locale;
  children: ReactNode;
}

export function Providers({ gatewayUrl, initialFeedMode, locale, children }: ProvidersProps) {
  const router = useRouter();
  const [queryClient] = useState(createQueryClient);
  const [platform] = useState(createWebPlatform);
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineControlContext value={platform.network}>
        <CoreProvider
          gatewayUrl={gatewayUrl}
          initialFeedMode={initialFeedMode}
          storage={platform.storage}
          colorScheme={platform.colorScheme}
          network={platform.network}
          lifecycle={platform.lifecycle}
          locale={locale}
          switchLocale={(next, apply) => {
            switchDocumentLocale(next, apply);
            router.refresh();
          }}
        >
          <FeedSessionBoundary>{children}</FeedSessionBoundary>
        </CoreProvider>
      </OfflineControlContext>
    </QueryClientProvider>
  );
}

"use client";

import { CoreProvider, type Locale } from "@mini/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { switchDocumentLocale } from "../platform/document-locale.ts";
import { OfflineControlContext } from "../platform/offline-context.tsx";
import { createWebPlatform } from "../platform/web-platform.ts";
import { createQueryClient } from "../query/query-client.ts";

export interface ProvidersProps {
  gatewayUrl: string;
  locale: Locale;
  children: ReactNode;
}

export function Providers({ gatewayUrl, locale, children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);
  const [platform] = useState(createWebPlatform);
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineControlContext value={platform.network}>
        <CoreProvider
          gatewayUrl={gatewayUrl}
          storage={platform.storage}
          network={platform.network}
          lifecycle={platform.lifecycle}
          locale={locale}
          switchLocale={switchDocumentLocale}
        >
          {children}
        </CoreProvider>
      </OfflineControlContext>
    </QueryClientProvider>
  );
}

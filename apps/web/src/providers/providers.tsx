"use client";

import { useRouter } from "next/navigation";
import { CoreProvider, type Locale } from "@mini/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createTableColumnsStore } from "../columns/table-columns-store.ts";
import { TableColumnsContext } from "../columns/use-table-columns.ts";
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
  const router = useRouter();
  const [queryClient] = useState(createQueryClient);
  const [platform] = useState(createWebPlatform);
  const [columns] = useState(() => createTableColumnsStore(platform.storage));
  return (
    <TableColumnsContext value={columns}>
      <QueryClientProvider client={queryClient}>
        <OfflineControlContext value={platform.network}>
          <CoreProvider
            gatewayUrl={gatewayUrl}
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
            {children}
          </CoreProvider>
        </OfflineControlContext>
      </QueryClientProvider>
    </TableColumnsContext>
  );
}

"use client";

import { CoreProvider } from "@mini/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createWebPlatform } from "../platform/web-platform.ts";
import { createQueryClient } from "../query/query-client.ts";

export interface ProvidersProps {
  gatewayUrl: string;
  children: ReactNode;
}

export function Providers({ gatewayUrl, children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);
  const [platform] = useState(createWebPlatform);
  return (
    <QueryClientProvider client={queryClient}>
      <CoreProvider
        gatewayUrl={gatewayUrl}
        storage={platform.storage}
        network={platform.network}
        lifecycle={platform.lifecycle}
      >
        {children}
      </CoreProvider>
    </QueryClientProvider>
  );
}

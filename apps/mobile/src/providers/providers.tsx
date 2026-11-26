import { CoreProvider } from "@mini/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { gatewayUrl } from "../config/gateway-url.ts";
import { switchNativeLocale } from "../platform/locale-switch.ts";
import { createNativePlatform } from "../platform/native-platform.ts";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [platform] = useState(createNativePlatform);
  return (
    <QueryClientProvider client={queryClient}>
      <CoreProvider
        gatewayUrl={gatewayUrl}
        storage={platform.storage}
        network={platform.network}
        lifecycle={platform.lifecycle}
        switchLocale={switchNativeLocale}
      >
        {children}
      </CoreProvider>
    </QueryClientProvider>
  );
}

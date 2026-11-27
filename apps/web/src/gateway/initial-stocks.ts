import { createRestClient } from "@mini/core";
import { cache } from "react";

export const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

const rest = createRestClient({
  gatewayUrl,
  fetch: (url, init) =>
    fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(2_000) }),
});

export const readInitialStocks = cache(() => rest.listStocks());

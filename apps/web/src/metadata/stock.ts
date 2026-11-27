import { createRestClient, stockQueryOptions } from "@mini/core";
import { cache } from "react";
import { gatewayUrl } from "../gateway/shell-meta.ts";
import { getServerQueryClient } from "../query/server-query-client.ts";

const rest = createRestClient({ gatewayUrl });

export const readStock = cache((symbol: string) =>
  getServerQueryClient().fetchQuery(stockQueryOptions(rest, symbol)),
);

import { CompanyProfileResponseSchema, type CompanyProfileResponse } from "@mini/contracts";
import { queryOptions } from "@tanstack/react-query";
import {
  createRestRequester,
  type AbortSignalLike,
  type RestClientOptions,
} from "./rest-client.ts";

export type ProfileFetcher = (
  symbol: string,
  signal?: AbortSignalLike,
) => Promise<CompanyProfileResponse>;

export function createProfileFetcher(options: RestClientOptions): ProfileFetcher {
  const request = createRestRequester(options);
  return (symbol, signal) =>
    request(`/stocks/${encodeURIComponent(symbol)}/profile`, CompanyProfileResponseSchema, signal);
}

export function profileQueryOptions(fetchProfile: ProfileFetcher, symbol: string) {
  return queryOptions({
    queryKey: ["company-profile", symbol],
    queryFn: async ({ signal }) => {
      const data = await fetchProfile(symbol, signal);
      if (data.symbol !== symbol) throw new Error("Profile symbol mismatch");
      return data;
    },
    staleTime: 3_600_000,
    retry: false,
  });
}

"use client";

import { useCompanyProfile } from "@mini/core";
import { CompanyProfile } from "../components/company-profile.tsx";

export function ConnectedCompanyProfile({ symbol }: { symbol: string }) {
  const view = useCompanyProfile(symbol);
  return <CompanyProfile view={view} />;
}

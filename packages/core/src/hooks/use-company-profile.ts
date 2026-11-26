"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useCore } from "../core-provider.tsx";
import { formatMarketDateTime } from "../format/time-format.ts";
import { profileQueryOptions } from "../rest/profile-query.ts";
import { useT } from "./use-t.ts";

export function useCompanyProfile(symbol: string) {
  const { fetchProfile } = useCore();
  const t = useT();
  const query = useQuery(profileQueryOptions(fetchProfile, symbol));
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const retry = () => {
    void query.refetch();
  };
  if (!query.data) return { status: query.isError ? "error" : "loading", retry } as const;
  const { profile, source, fetchedAt } = query.data;
  if (!profile || !Object.entries(profile).some(([key, value]) => key !== "kind" && value !== null))
    return { status: "empty" } as const;
  const expanded = expandedSymbol === symbol;
  const fullDescription = profile.description ?? t("profile.noDescription");
  const hasMore = fullDescription.length > 320;
  const excerpt = fullDescription.slice(0, 320).replace(/\s+\S*$/, "");
  const facts = [
    { id: "sector", label: t("profile.sector"), value: profile.sector },
    { id: "industry", label: t("profile.industry"), value: profile.industry },
    { id: "exchange", label: t("profile.exchange"), value: profile.exchange },
  ].flatMap((fact) => (fact.value ? [{ ...fact, value: fact.value }] : []));
  return {
    status: "ready",
    heading: t(profile.kind === "fund" ? "profile.aboutFund" : "profile.about"),
    description: hasMore && !expanded ? `${excerpt}…` : fullDescription,
    expanded,
    hasMore,
    facts,
    website: profile.website,
    toggle: () => setExpandedSymbol(expanded ? null : symbol),
    attribution: source === "simulated" ? t("profile.sample") : t("profile.source"),
    retrieved:
      source === "simulated"
        ? null
        : t("profile.retrieved", { time: formatMarketDateTime(fetchedAt) }),
  } as const;
}

export type CompanyProfileView = ReturnType<typeof useCompanyProfile>;

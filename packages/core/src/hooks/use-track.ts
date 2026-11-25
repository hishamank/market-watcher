"use client";

import type { AnalyticsEvent } from "../analytics/analytics.ts";
import { useCore } from "../core-provider.tsx";

export function useTrack(): (event: AnalyticsEvent) => void {
  return useCore().track;
}

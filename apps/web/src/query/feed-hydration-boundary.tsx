"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { FeedSessionBoundary } from "../providers/feed-session-boundary.tsx";

export function FeedHydrationBoundary({
  state,
  children,
}: {
  state: DehydratedState;
  children: ReactNode;
}) {
  return (
    <FeedSessionBoundary pendingData={state.queries.map((query) => query.state.data)}>
      <HydrationBoundary state={state}>{children}</HydrationBoundary>
    </FeedSessionBoundary>
  );
}

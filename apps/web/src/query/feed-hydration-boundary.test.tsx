import type { FeedMode } from "@mini/contracts";
import { CoreProvider, useQuote } from "@mini/core";
import { dehydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "../../../../packages/core/src/testing/fake-platform.ts";
import { stockListBody } from "../../../../packages/core/src/testing/fake-rest.ts";
import { FeedSessionBoundary } from "../providers/feed-session-boundary.tsx";
import { FeedHydrationBoundary } from "./feed-hydration-boundary.tsx";

function Price() {
  return <span>{useQuote("AAPL")?.price}</span>;
}

function render(
  initialFeedMode: FeedMode | null,
  client: QueryClient,
  pending = new QueryClient(),
) {
  return renderToString(
    <QueryClientProvider client={client}>
      <CoreProvider
        gatewayUrl="http://test"
        initialFeedMode={initialFeedMode}
        storage={createFakeStorage()}
        network={createFakeNetwork()}
        lifecycle={createFakeLifecycle()}
      >
        <FeedSessionBoundary>
          <FeedHydrationBoundary state={dehydrate(pending)}>
            <Price />
          </FeedHydrationBoundary>
        </FeedSessionBoundary>
      </CoreProvider>
    </QueryClientProvider>,
  );
}

function seeded(mode: FeedMode) {
  const client = new QueryClient();
  client.setQueryData(["stocks", "list"], {
    ...stockListBody([makeQuote("AAPL", "222.00", 1)]),
    feedMode: mode,
  });
  return client;
}

for (const mode of ["live", "simulated"] as const) {
  const other = mode === "live" ? "simulated" : "live";
  it(`hides incompatible preseeded data during ${mode} SSR`, () => {
    const html = render(mode, seeded(other));
    expect(html).toContain('data-testid="feed-reload-required"');
    expect(html).not.toContain("222.00");
  });

  it(`rejects incompatible nested hydration before ${mode} SSR or cache insertion`, () => {
    const client = new QueryClient();
    const html = render(mode, client, seeded(other));
    expect(html).toContain('data-testid="feed-reload-required"');
    expect(html).not.toContain("222.00");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it(`preserves ${mode} hydration`, () => {
    const html = render(mode, new QueryClient(), seeded(mode));
    expect(html).toContain("222.00");
    expect(html).not.toContain('data-testid="feed-reload-required"');
  });
}

it("rejects internally mixed hydration even before identity is established", () => {
  const pending = seeded("live");
  pending.setQueryData(["stocks", "history", "AAPL"], { feedMode: "simulated" });
  const client = new QueryClient();
  const html = render(null, client, pending);
  expect(html).toContain('data-testid="feed-reload-required"');
  expect(html).not.toContain("222.00");
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});

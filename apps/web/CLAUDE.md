# Web

Next.js App Router. Views and connected components only, with logic coming from core.

- Routes are `/` (`?view=watchlist`) and `/stocks/[symbol]` (`?range=`). View state lives in the URL.
- Server components prefetch through TanStack Query and `HydrationBoundary`. The socket starts after hydration.
- Core formatters pass an explicit locale and time zone. Relative times render only in the browser.
- Device-only state, such as stars, renders neutral on the server.
- Tailwind with logical utilities (`ms-`, `pe-`, `start-`).
- Imperative libraries such as Lightweight Charts live in `integrations/`.
- Test IDs come from `docs/feature-map.md`. Add new ones there first.
- Playwright test titles start with their feature ID.

# The server renders the first frame, and the socket takes over after hydration

The URL holds view state: `/` for the list (with `?view=watchlist`) and `/stocks/[symbol]` for detail (with `?range=`), so links are shareable, the back button works, and the server knows what to render. Server components prefetch the list, the detail quote and the default range's history through TanStack Query, and hand them to the browser through `HydrationBoundary`. Every REST response carries `feedMode` and `marketStatus`, so the badge renders on the server.

Hydration mismatches are prevented by construction:

- **The quote store is per instance:** it is created inside `CoreProvider`, once per request on the server and once per page load in the browser, never at module scope, because a module-level store on the server would be shared by every user. Until a symbol has a quote in the store, `useQuote` reads it from the prefetched query data, so the server and the first client frame show the same price without writing to the store during render. After mount, the query cache feeds the store outside render.
- **Formatting is explicit:** every number and date formatter passes an explicit locale and time zone (`en-US`, `America/New_York`), and no relative time ("3 seconds ago") is rendered on the server.
- **The chart is browser-only:** the server renders a skeleton of the same size, so the layout does not shift.
- **Device-only state is neutral on the server:** stars render empty and the watchlist view shows a skeleton until hydration. The server-side watchlist is the real fix, not cookies.

The socket opens only in the browser, after hydration. If server rendering of live data proves costly to get right, the fallback is server-rendered skeletons filled on the client. The URL, routes and providers stay as they are.

# The list view toggle switches in the browser

Amends feature L5. ADR 0023 still holds: the URL owns the view, and a direct load of `/?view=watchlist` renders on the server.

The All and Watchlist toggle was a plain Next `Link`. `/` is a dynamic route, so each click waited for a fresh server render before anything moved. That render ran the root layout's shell meta fetch and the page's stock list prefetch, two gateway round trips, and sent back nothing the browser didn't already have. The browser cache already held the list, and the watchlist is device state that the server can only show as a skeleton. On the hosted demo, or on a first dev compile, the old view stayed frozen for about a second.

Now a plain click on either option calls `window.history.pushState`, the same way the detail page changes `?range=` (ADR 0029). `ListPage` reads the view from `useSearchParams()`, so the toggle and the list change in the same frame. The options stay real links with real `href`s, so a modified or middle click still opens a new tab, and back and forward still restore the view. The watchlist's empty-state button switches back to All the same way.

> **Design note:** "Switching views needed nothing from the server. The list was in the query cache and the watchlist lives on the device. So I made it a shallow URL change instead of a server navigation. It's instant, the URL is still the source of truth, and a direct load still renders on the server."

## Considered options

- **A `loading.tsx` skeleton:** shows something at once but still waits on the same server render to show real rows. A root one also puts a Suspense boundary in front of L1's first paint. The watchlist already shows a server-rendered skeleton on a direct load.
- **Show a pending state with `useLinkStatus`:** makes the wait visible but doesn't remove it.
- **Keep the view in React state only:** instant, but it breaks shareable links and the back button.

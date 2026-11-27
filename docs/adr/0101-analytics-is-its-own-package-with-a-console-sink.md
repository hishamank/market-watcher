# Analytics is its own package with a console sink

Amends ADR 0016 and ADR 0041.

Analytics moves out of core into `packages/analytics` (`@mini/analytics`). It holds the event catalogue, the `AnalyticsAdapter` interface, a no-op adapter and a console adapter, and the React pieces: `AnalyticsProvider`, `useTrack` and `useTrackOnce`. ADR 0016 had five events going to a no-op adapter that neither app replaced, so nothing was ever recorded. ADR 0041 then added `useTrack` so components could record `stock_opened` and `range_changed`, but it left the "core hooks only" rule in place. This ADR replaces that rule and widens the catalogue to the questions we want answered about the product.

- **Dependency direction:** contracts ← analytics ← core ← apps. Analytics imports only React and contracts, and its connection states are a literal union that core's `ConnectionStatus` must stay assignable to. `.oxlintrc.json` applies core's platform-agnostic import rules to it.
- **Core keeps the single injection point.** `CoreProviderProps.analytics` still takes the adapter. Core wraps it in a `track` that adds the context (locale and feed mode) to every event, and renders `AnalyticsProvider` with it, so `useTrack()` works anywhere under `CoreProvider`.
- **Where events fire:** an event fires from the core hook that owns the action when there is one (watchlist, search, web theme, connection, failed requests, session start). Otherwise it fires from the app's own event handler through `useTrack()` (range, list view, columns, news, search result chosen, language, mobile appearance). Language is tracked in the controls, not in `useLanguage`, because mobile restores a saved locale through the same `setLocale` at launch, and that is not a choice. "Viewed" events go through `useTrackOnce(event, key)`, which fires once per key, so StrictMode does not double-count. No event fires during render.
- **The sink is the console in development, and nothing in production, for now.** Both apps pass `createConsoleAnalytics({ platform, log })` from their platform setup in development (`NODE_ENV` on web, `__DEV__` on mobile) and `createNoopAnalytics()` in production builds, so the hosted demo prints nothing to visitors' consoles. It prints one `console.info` line per event: `[analytics] <name>` followed by the event's properties, the platform, the locale and the feed mode. `info` keeps it out of the error and warning collectors in verify, and the production E2E build logs nothing. Any provider, such as PostHog, replaces the console by implementing `AnalyticsAdapter.track(event, context)` and being passed in its place. No call site changes.
- **Privacy:** no raw search text (lengths and counts only), no URLs or headlines, and no user, device or session identifiers. Nothing is persisted. Tickers are public catalogue values and may be sent.
- **Frozen API:** `useTrack`, `AnalyticsAdapter` and `AnalyticsEvent` leave the core barrel for `@mini/analytics`, and `AnalyticsAdapter.track` gains the `context` argument. No core type gains a field. The owner approved this change to the frozen API.

## Catalogue

| Event | Properties | Question it answers | Fires from |
| --- | --- | --- | --- |
| `session_started` | none | How many sessions, by platform, locale and feed? | `CoreProvider`, once per instance, on its first connection, when the feed mode is known |
| `stock_opened` | `symbol` | Which stocks get attention? | Detail view once the stock resolves, so a 404 is not counted |
| `range_changed` | `symbol`, `range` | Are ranges beyond 1D used? | Each app's range handler |
| `watchlist_toggled` | `symbol`, `starred`, `watchlistSize` | Is the watchlist adopted, and how big does it get? | `useWatchlist().toggle` |
| `search_performed` | `queryLength`, `resultCount` | How often does search return nothing? | `useSearch`, once per settled query, cached or fetched |
| `search_result_selected` | `queryLength`, `resultCount`, `position` | Does search lead somewhere, and from which rank? | Web header search, mobile search screen |
| `list_view_changed` | `view` | Is the watchlist view used? | Web view toggle, mobile tab press |
| `language_changed` | `from`, `to` | Is Arabic used? | Web language toggle, mobile Settings |
| `theme_changed` | `to` | Is dark mode used? | `useColorScheme().toggle` on web, Settings on mobile |
| `columns_changed` | `action`, `column` | Is the column manager worth keeping? | Web column menu |
| `news_opened` | `symbol`, `position` | Does news drive engagement? | Each app's news list; live feed only, since simulated articles have no link |
| `request_failed` | `resource`, `code` | Which surface fails, and why? | A query cache listener in core, for `RestClientError` only |
| `connection_status_changed` | `from`, `to`, `msInPrevious` | How often and for how long are users stale or offline? | The socket status listener in core |

`position` is zero-based. A session that never connects is not counted. `search_performed` counts each pause in typing that settles on a query, so read it together with `search_result_selected`. `list_view_changed` on mobile fires only when the pressed tab was not already active.

## Considered options

- **Keep analytics in core:** fewer packages, but the catalogue and adapters are a separate concern that a provider adapter will grow, and apps would keep importing tracking from the data layer.
- **A second, app-owned provider:** apps would wrap their trees themselves, but core's hooks would then need a separate way to reach the same sink.
- **Console everywhere, production included:** events would be observable on the hosted demo, but every visitor would see them in their console. The owner chose development only.
- **Retry and section-expand events:** cut. `request_failed` covers failures with one listener instead of a call in each of about eleven retry buttons.

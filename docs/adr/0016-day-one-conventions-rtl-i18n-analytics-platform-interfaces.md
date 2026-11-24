# Day-one conventions: right-to-left readiness, i18n, analytics and platform interfaces

These cost almost nothing on day one and a lot to retrofit, so they are part of the core build.

- **Right-to-left readiness:** layouts use logical properties only, start and end and never left and right. Prices, tickers and charts are always laid out left to right.
- **i18n:** every user-facing string goes through a `useT()` hook in core backed by i18next, with one English catalogue in core shared by both apps. We use a library rather than a hand-written `t()` because Arabic needs six plural forms, and keeping it behind `useT()` means swapping it later touches one file. Hermes has no `Intl.PluralRules`, so the mobile app loads the `intl-pluralrules` polyfill before i18next when the Arabic translation lands. Number and date formatters in core take their locale from the same source, and do not use `NumberFormat.formatToParts`, which Hermes lacks on Apple platforms.
- **Analytics:** a typed `track(event)` over a fixed union of events (`stock_opened`, `range_changed`, `watchlist_toggled`, `search_performed`, `connection_status_changed`), with a no-op adapter. It is called only from core hooks, never from components. PostHog is a later adapter.
- **Platform interfaces:** storage, network status and app lifecycle are interfaces in core, implemented by each app (ADR 0002).

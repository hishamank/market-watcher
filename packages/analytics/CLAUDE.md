# Analytics

The product event catalogue and the adapters that receive it, shared by core and both apps (ADR 0101).

- `AnalyticsEvent` is the only list of events. Add an event here first, with the product question it answers in ADR 0101.
- Imports come from React and contracts only. It never imports core or an app, so core can depend on it.
- An adapter receives each event with the context core adds (locale and feed mode). The console adapter is the sink in development for now, and the no-op in production; a provider such as PostHog replaces it by implementing `AnalyticsAdapter`.
- No raw search text, URLs, headlines, or user, device or session identifiers in any event.
- Tests run in plain Node.

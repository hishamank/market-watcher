# Web owns table column choices

Core previously created a table column store for every provider, including mobile, although only the web table consumes it. Keeping platform-independent storage behind an interface does not make desktop column policy shared business logic.

Move the existing store, hook, types and tests into `apps/web/src/columns`. The web provider creates one store per provider using the existing storage adapter; a web context shares it between the list and menu. Preserve the `table-columns:v1` key, locked columns, defaults, persistence, cross-tab updates and server snapshot. Remove the column exports and construction from core. No data migration is needed.

A module-level singleton would be shorter but would share state across provider instances and server requests. Retaining a core store with optional construction would leave web policy in the shared package and add configuration. The web-owned context keeps one owner without either compromise.

Shared financial policy, connection recovery and queries remain in core. Platform-specific presentation state and local view derivation may live in an app. This narrows the old all-logic-in-core convention; it does not permit divergent financial policy on web and mobile.

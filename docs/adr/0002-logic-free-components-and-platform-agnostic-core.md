# Logic-free components and a platform-agnostic core

All client logic lives in `packages/core` and runs unchanged on React (web) and React Native (Expo). Each app owns only its UI, in two kinds of component:

- **Views** are props-only and import nothing from core except types and formatters.
- **Connected components** are thin wrappers, including screens and routes, that call one or two core hooks and pass the results to a view. They hold no branching logic, fetching, timers or derived calculations.

We chose "logic-free" over "dumb" because fully dumb list rows would force the list parent to hold every price and re-render on every tick. A connected row can subscribe to its own symbol, so a tick re-renders one row.

## Consequences

- Core depends on React and TanStack Query as peer dependencies. It bans DOM, Next.js and React Native imports, enforced by lint and by a TypeScript config without the DOM library.
- Anything platform-specific (storage, network status, app lifecycle, the socket constructor if needed) is an interface in core, implemented by each app and injected through one `CoreProvider`.
- A feature is not done until its core hooks would work in both apps, even while only the web app exists.

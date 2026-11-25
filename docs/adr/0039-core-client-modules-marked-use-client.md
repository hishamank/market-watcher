# Core marks its client-only modules with "use client"

Amends ADRs 0020 and 0023.

Server components in the web app prefetch through TanStack Query, so they import the REST client, the query keys and the query option factories from `@mini/core`. The single `index.ts` (ADR 0020) also exports `CoreProvider` and the hooks, which use `createContext`, `useState`, `useEffect` and `useSyncExternalStore`, and Next.js refuses those in the server graph. Every module in core that uses a client-only React API starts with the `"use client"` directive. Next.js then treats those exports as client references on the server, and everything else in `index.ts` stays callable there. Metro and Vitest ignore the directive, so mobile and the tests are unchanged.

The REST client, the query keys and options, the live-quote merge and the watchlist store import nothing from React or the provider, so a server component can call them. A new core module that calls a client-only React API needs the directive too. The web layout's shell meta imports `buildRestBaseUrl` from `@mini/core` on the server, so `pnpm build` fails when such a module is missing the directive.

`CoreProvider` now calls `useQueryClient()` to refetch the visible history on reconnect, so it must sit under a `QueryClientProvider`. It takes no new required props.

## Considered options

- **A React-free subpath such as `@mini/core/query`:** works without directives, but splits the public API across two entry points, against ADR 0020's single checkable `index.ts`.
- **`"use client"` on `index.ts`:** every export becomes a client reference, so a server component could no longer call the query option factories.

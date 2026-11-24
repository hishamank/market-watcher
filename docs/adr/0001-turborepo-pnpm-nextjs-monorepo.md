# Turborepo monorepo with pnpm workspaces and Next.js

The web app, Expo app, market data gateway and shared packages live in one Turborepo with pnpm workspaces, so one change to a message contract is type-checked against every consumer in a single commit. There are six workspaces: `apps/web` (Next.js, App Router), `apps/mobile` (Expo), `apps/gateway` (Node), `packages/contracts`, `packages/core` and `packages/tokens`. A new workspace needs a reason.

## Considered options

- **Bun workspaces:** faster installs, but more friction with Expo and Metro than I want in a first version.
- **Vite single-page app instead of Next.js:** would remove the server rendering and hydration work, but Next.js is a common production choice, and its clear server and client boundary suits a live-data app. We accept the hydration work that comes with it.

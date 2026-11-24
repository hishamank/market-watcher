# Code rules are enforced by tooling, not by convention

- **No comments:** a small custom OxLint rule fails on any comment except tool directives such as `@ts-expect-error` and lint-disable lines. The why lives in ADRs and the what in names, because comments drift from the code. The JS plugin API is alpha, so the OxLint version is pinned.
- **Size limits:** at most 80 lines per function in the apps (which covers components) and 200 lines per file everywhere, using OxLint's native `max-lines-per-function` and `max-lines`.
- **Effects are fenced:** `useEffect` is banned in app components and allowed only in core and in one `integrations/` folder per app, for imperative libraries such as the chart. `no-restricted-imports` with `importNames` blocks the named import (and namespace imports of React), and `no-restricted-properties` blocks `React.useEffect`.
- **Re-renders:** React Compiler is on in both apps (stable `reactCompiler` in Next.js, `experiments.reactCompiler` in Expo), and `useMemo` or `useCallback` is written by hand only when a profile shows the need. The keyed quote store (ADR 0012) bounds the cost of live data by design.
- **Simplicity:** choose the simplest solution that works. A fix changes the fewest lines that solve the problem. This one is a written rule in `CLAUDE.md`, since no tool can enforce it.

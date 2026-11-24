# Critical-path unit and end-to-end tests

We test where a bug would be silent and expensive, not for coverage. Unit tests run on Vitest:

- **contracts:** the schemas.
- **core:** the socket client (reconnect, stale, backoff), the quote store (newest wins, per-symbol notification), subscription counting and coalescing, the function that merges bars with the live quote, and watchlist storage (corrupt values, cross-tab sync).
- **gateway:** hub reference counts, conflation and the backpressure skip, and the history cache (in-flight sharing, stale-while-revalidate, fallback).

Core tests run in plain Node, since core has no DOM.

Tests sit at three seams, each the highest boundary available: the gateway through its real REST and socket interface, started in-process; core's public API against an in-memory fake gateway that speaks the contracts; and the browser, through Playwright against the real gateway in simulator mode.

End-to-end tests are part of the core build. A small Playwright suite runs against the simulator with a fixed seed: the list loads and ticks, the detail chart switches range, a star survives a reload, and the stale banner appears when the gateway stops. They are the mechanical half of the verify skill, and the agent's walk through the app in a real browser is the judgement half.

CI on GitHub Actions runs OxLint, `oxfmt --check`, the type check, Vitest, the build, Playwright and a gitleaks secret scan. Oxfmt is beta, so its version is pinned.

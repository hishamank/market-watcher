# Separate platform designs, shared tokens, and a checkable core API freeze

Web and mobile get their own layouts and interaction patterns (hover and keyboard on web, gestures and tabs on mobile) but share one palette and type scale, so they read as one brand. `packages/tokens` holds raw values only, as TypeScript: colours for light and dark, spacing, type scale, radii and motion durations. Web turns them into CSS variables, and mobile imports them directly.

The core public API, one `index.ts`, is frozen once three things hold: the core tickets (realtime and data) are merged, a thin list on the web app ticks through `useQuote` against the real gateway, and the owner has reviewed the exports. We freeze on that proof rather than on the finished web screens, which land a wave later, so the Expo app starts against a stable API. Expo code starts at the freeze, because two apps chasing a moving API cost more than they save. Mobile design can start at any time. After the freeze, a change to core needs the owner's sign-off, so the two apps never break each other.

The frozen list and the test that pins it are in ADR 0041.

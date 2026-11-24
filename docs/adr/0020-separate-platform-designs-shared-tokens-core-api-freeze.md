# Separate platform designs, shared tokens, and a checkable core API freeze

Web and mobile get their own layouts and interaction patterns (hover and keyboard on web, gestures and tabs on mobile) but share one palette and type scale, so they read as one brand. `packages/tokens` holds raw values only, as TypeScript: colours for light and dark, spacing, type scale, radii and motion durations. Web turns them into CSS variables, and mobile imports them directly.

The core public API, one `index.ts`, is frozen once web's list, detail and watchlist work end to end against the gateway and the owner has reviewed those exports. Expo code starts at the freeze, because two apps chasing a moving API cost more than they save. Mobile design can start at any time. After the freeze, a change to core needs the owner's sign-off, so the two apps never break each other.

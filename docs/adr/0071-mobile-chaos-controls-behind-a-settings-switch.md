# Mobile chaos controls behind a Settings switch

Amends ADR 0030 and ADR 0036 on mobile. Feature M10.

A phone has no URL to carry `?debug=1`, so the Expo app opens the chaos controls from Settings instead. Settings gains a Debug section with one "Chaos controls" switch (`debug-toggle`), off by default. The section renders only when `useFeedMode()` is `simulated`: it is absent in Live mode and before the welcome tells the app the feed mode. The switch is saved in AsyncStorage as `debug-tools:v1`, the same way ADR 0069 saves `color-scheme:v1`, and restored at launch from `integrations/`.

While the switch is on and the feed is simulated, a bolt button (`chaos-open`) sits in the Markets and Watchlist tab header, before the gear, and at the end of the detail header. It opens the `debug` route as a native `formSheet` with two detents, half and full. The half detent is not dimmed, so the list or chart keeps ticking above the sheet while a control takes effect. The full detent dims as usual. The route is singular, so tapping the bolt again while the sheet is open does not stack a second sheet. The sheet body also renders nothing unless the feed is simulated.

The sheet holds what the web panel holds (ADR 0030, ADR 0040) through the same core hooks, test IDs and strings:

- **Your connection:** Drop connection and Freeze feed.
- **Everyone, reverts after 60 seconds:** Tick spike, History latency, Force market closed and History failures (Off, 50%, 100%), each with its countdown pill.
- **Connection health:** the four tiles from ADR 0036, Reconnects, Frames per second, Latency and Skipped frames, from `useConnectionHealth()`.

"Go offline" is left out. On a phone, airplane mode turns the real network off, which tests more than the adapter override web needs.

The issue asked for a check in Expo Go before relying on the sheet. It ran on iOS Expo Go (SDK 58, React Native 0.88.1, `react-native-screens` 4.30.1) in the iPhone 17 simulator, with a temporary probe that pushed the route:

- The sheet opened at half height with a grabber, and the list behind it was not dimmed. Prices behind it changed between two screenshots taken seconds apart.
- With the full detent as the initial one, the sheet covered the screen below the status bar and dimmed what was behind it.
- Pushing the route twice and going back once left no sheet open.

The sheet worked, so the fallback the issue allows (a pushed screen with the connection banner) was not needed. Android was not checked.

> **Design note:** "On mobile the chaos controls hide behind a switch in Settings, because a phone has no query string. The panel is a native half-height sheet that doesn't dim the screen, so you can drop the connection or spike the ticks and watch the prices react behind it. I left out Go offline: airplane mode is the real thing."

## Considered options

- **A pushed screen with the connection banner:** the fallback in the issue. It works everywhere, but it hides the prices the controls are meant to disturb.
- **Always show the bolt in simulated mode:** one tap fewer, but it puts a debug control in every user's header by default.
- **A long press or shake gesture to open the panel:** no visible entry point, and Expo Go already uses the shake gesture for its own menu.

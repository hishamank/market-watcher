# Mobile status strip under the native header

Amends ADR 0059 for the Expo app. ADR 0004 still holds: Markets, Watchlist and the detail screen always show Simulated or Live.

On a phone the native header already holds the title and the language toggle at the end, and M6 adds a Settings gear there. The badge beside them runs into the same width problem ADR 0059 measured at 360 px. The header itself is drawn by the navigator, so a strip above it would mean replacing the native header, its back button and its safe area handling on every screen.

The app instead puts the 28 px strip directly under the native header, above the connection banner, on Markets, Watchlist and the detail screen. It uses `color.fill` with a hairline `color.border` bottom edge, because the offline banner below it uses the same fill and the two would merge. The badge is the dot and the word, never a pill and never a tap target. Each screen renders the strip from its first frame and leaves it empty until the welcome message names the feed mode, so it stays empty while the gateway is unreachable and the list never moves when the badge appears. The strip has no block padding: the Arabic caption line is 22 px, and with web's 4 px padding the strip would grow to 30 px when the badge arrives. Market closed, from ADR 0004, will join the strip as a second item after the badge.

## Considered options

- **The badge in the native header:** it competes with the title, the language toggle and the Settings gear for the same row, and on the detail screen with the back button and the ticker.
- **A strip above the native header, as on the web:** needs a custom header on every screen to match the web order, and gives up the native back button and title transitions.
- **Rendering the strip only once the feed mode is known:** the list jumps 28 px down after the first frame, every time the app opens.

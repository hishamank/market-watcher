# Expo Go as a constraint, and react-native-graph for the mobile chart

The mobile app must run in Expo Go, so anyone can scan a QR code and nothing has to be built. That rules out custom native modules. The chart uses Margelo's `react-native-graph`, a Skia line chart with pan scrubbing that is closest to the feel we want. The first Expo ticket spends up to an hour confirming it on SDK 58 in Expo Go and falls back to `react-native-wagmi-charts`, which is SVG-based and has a crosshair, if it does not work.


Result of the check (25 Nov 2026, Expo Go for SDK 58 on an Android 16 emulator): `react-native-graph` 1.4.0 does not work with the bundled `@shopify/react-native-skia` 2.14. Its animated graph calls `Skia.Path.Make().moveTo`, which is undefined there, so rendering throws "undefined is not a function". The mobile chart therefore takes the fallback, decided in N02.

Result of the fallback (26 Nov 2026, N02, same emulator and Expo Go build): `react-native-wagmi-charts` 3.0.1, with `react-native-svg` 15.16.0 from `npx expo install`, renders and scrubs on SDK 58 with Reanimated 4.7 and Gesture Handler 3.3, so it is the mobile chart. `@shopify/react-native-skia` left with `react-native-graph`, because nothing else used it. Three settings make it fit live prices:

- **Path transitions off.** At about four ticks a second, wagmi's default path animation re-interpolates the whole 1D line (about 265 points) almost continuously. With it off, scrub events reached the app 43 to 529 ms after the finger moved in 14 of 15 timed moves on the software-rendered emulator (one took 1.2 s), always in order with the end last, and the header followed each one within 15 ms.
- **`snapToPoint` on the cursor.** Without it the cursor's index ignores `xDomain`, so on the 1D session axis the readout named the wrong bar.
- **Only the bar index crosses from the chart.** On native, Reanimated ignores the dependencies of wagmi's index reaction, so the callback it calls can belong to an earlier render. The chart reports an index, the screen keeps it in state, and the bar is looked up in the current history at render time, so a late callback never shows an old price. The readout is cleared when the gesture ends, not when the index returns to -1, because a late index can arrive after the end.

## Considered options

- **Victory Native XL:** its current release needs a custom native build on SDK 58, which breaks the Expo Go constraint.

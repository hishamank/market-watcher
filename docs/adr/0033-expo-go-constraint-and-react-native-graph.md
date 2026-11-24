# Expo Go as a constraint, and react-native-graph for the mobile chart

The mobile app must run in Expo Go, so anyone can scan a QR code and nothing has to be built. That rules out custom native modules. The chart uses Margelo's `react-native-graph`, a Skia line chart with pan scrubbing that is closest to the feel we want. The first Expo ticket spends up to an hour confirming it on SDK 58 in Expo Go and falls back to `react-native-wagmi-charts`, which is SVG-based and has a crosshair, if it does not work.

## Considered options

- **Victory Native XL:** its current release needs a custom native build on SDK 58, which breaks the Expo Go constraint.

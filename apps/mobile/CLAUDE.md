# Mobile

Expo, running in Expo Go, so only libraries bundled with the SDK.

- Work starts after the core API freeze. A change to core needs the owner's sign-off.
- Expo Router: Markets and Watchlist tabs, and a stack for detail.
- `StyleSheet` with tokens, using start and end style properties.
- AsyncStorage, `expo-network` and AppState implement the core interfaces.
- The chart (`react-native-graph`, falling back to wagmi-charts) lives in `integrations/`.
- `testID` names match `docs/feature-map.md`.

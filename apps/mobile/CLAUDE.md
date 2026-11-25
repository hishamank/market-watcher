# Mobile

Expo, running in Expo Go, so only libraries bundled with the SDK.

- Work starts after the core API freeze. A change to core needs the owner's sign-off.
- Expo Router: Markets and Watchlist tabs, and a stack for detail.
- `StyleSheet` with tokens, using start and end style properties.
- AsyncStorage, `expo-network` and AppState implement the core interfaces.
- The chart (`react-native-wagmi-charts` on `react-native-svg`, ADR 0033) lives in `integrations/`. Only a bar index leaves it, and its path transitions stay off.
- `testID` names match `docs/feature-map.md`.
- There is no `metro.config.js`. Expo SDK 58 detects the pnpm workspace by itself, so `@mini/*` packages resolve with pnpm's default isolated installs.
- `EXPO_PUBLIC_GATEWAY_URL` sets the gateway, and is read at bundle time. A phone needs the computer's LAN IP and a gateway started with `HOST=0.0.0.0`.

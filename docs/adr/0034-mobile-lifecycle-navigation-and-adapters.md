# Mobile lifecycle, navigation and platform adapters

When the app goes to the background, the socket closes after a 10-second grace period, so a quick app switch does not reconnect. On returning to the foreground the app reconnects, takes fresh snapshots, and refetches the visible chart's history, the same path as any reconnect (ADR 0009). Navigation uses Expo Router, with two tabs (Markets and Watchlist) and a stack for detail. AsyncStorage implements the storage interface and `expo-network` implements network status, and both work in Expo Go.

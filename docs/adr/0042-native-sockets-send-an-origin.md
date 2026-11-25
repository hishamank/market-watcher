# Native sockets send an Origin, so the allowlist names the gateway's origin

Amends ADR 0028.

ADR 0028 accepts socket connections with no `Origin` header "because native apps do not send one". That reason is wrong for React Native. Its WebSocket adds an `Origin` built from the socket URL on both platforms, with `ws` mapped to `http` and `wss` to `https`, and the host and port kept:

- **Android:** `WebSocketModule` adds `origin: getDefaultOrigin(url)` when the caller sets none ([WebSocketModule.kt#L150](https://github.com/facebook/react-native/blob/v0.88.1/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/websocket/WebSocketModule.kt#L150), [getDefaultOrigin](https://github.com/facebook/react-native/blob/v0.88.1/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/websocket/WebSocketModule.kt#L468)).
- **iOS:** `RCTWebSocketModule` opens an `SRWebSocket` ([RCTWebSocketModule.mm#L152](https://github.com/facebook/react-native/blob/v0.88.1/packages/react-native/React/CoreModules/RCTWebSocketModule.mm#L152)), and SocketRocket 0.7.1, the version React Native pins, sets `Origin` to `SRURLOrigin(url)` in every handshake ([SRHTTPConnectMessage.m#L59](https://github.com/facebookincubator/SocketRocket/blob/0.7.1/SocketRocket/Internal/Utilities/SRHTTPConnectMessage.m#L59), [SRURLOrigin](https://github.com/facebookincubator/SocketRocket/blob/0.7.1/SocketRocket/Internal/Utilities/SRURLUtilities.m#L16)).

React Native's `fetch` sends no `Origin`, so REST and its CORS check are unaffected. The phone's socket, though, reaches the origin check carrying the gateway's own origin, and the gateway refuses it unless `ALLOWED_ORIGINS` lists that origin. Prices then load over REST and never tick.

So `ALLOWED_ORIGINS` must name the gateway's own origin wherever a phone connects:

- **Development:** `http://<LAN IP>:4000`, next to the web origins. Setting the variable replaces the default list, so the list keeps `http://localhost:3000` for web. The verify skill's Expo launch does this, and its doctor checks the handshake.
- **Production (N04):** the hosted gateway's own `https://` origin, next to the hosted web origin.

The list stays explicit. The rest of ADR 0028 holds: the check is not authentication, it only stops other websites from using their visitors' browsers to consume the feed, and a connection with no `Origin` is still accepted.

## Considered options

- **Explicit allowlist (chosen):** one environment variable, already in place, with no gateway code change and nothing to infer. Each deployment says which origins it trusts.
- **Trust the gateway's own configured origin automatically:** it still stops unrelated websites while the gateway serves no pages, but it adds little over listing that one origin, and it would silently trust any page hosted on that origin later.
- **Derive the gateway's origin from the request's `Host` or forwarded headers:** needs no configuration, but those headers are set by the client or the proxy, so it needs deliberate proxy and host validation to mean anything.
- **Override `Origin` in a native `SocketFactory`:** moves the configuration into the app and proves nothing about the caller, because any client can send any header.
- **Accept every origin, or drop the check:** lets any website use its visitors' browsers to consume the feed, which is what ADR 0028 exists to stop.

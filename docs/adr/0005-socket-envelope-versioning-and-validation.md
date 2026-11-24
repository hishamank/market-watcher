# Socket envelope, versioning and validation

Every socket message is JSON of the form `{ type, ...payload }`, a union keyed on `type` and defined once in `packages/contracts`. Both ends parse every inbound message with Zod 4. A message that fails to parse is logged and dropped rather than thrown, so one bad frame cannot take down a client or the gateway.

The protocol version is agreed once per connection, not stamped on every message. The client connects to `/ws?v=1`. If the server does not support that version, it sends an `unsupported_version` error and closes, which is the only error that closes the connection. Otherwise the server's first message is `welcome`, carrying `protocolVersion`, `feedMode`, `marketStatus`, `heartbeatIntervalMs`, `maxSubscriptions` and `serverTime`.

## Considered options

- **A version field on every message:** redundant within one connection, and noise in every frame.
- **Valibot:** smaller bundles, but Zod is more familiar to most TypeScript developers, and the size difference is a few kilobytes.

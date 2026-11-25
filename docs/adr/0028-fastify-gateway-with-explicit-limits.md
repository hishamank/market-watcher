# Fastify gateway with explicit limits

Amended by [ADR 0042](./0042-native-sockets-send-an-origin.md): React Native's WebSocket does send an `Origin`, so `ALLOWED_ORIGINS` must list the gateway's own origin for phones.

The gateway runs on Fastify with `@fastify/websocket`, which exposes the raw `ws` socket, so conflation can read its send buffer (ADR 0008). It uses `@fastify/rate-limit`, `@fastify/cors` and Fastify's structured logging, and validates REST input and output with the Zod schemas from `packages/contracts`.

- **Origin check:** browser connections must come from an allowed origin. Connections with no Origin header are accepted, because native apps do not send one. The check is not authentication. It stops other websites from using their visitors' browsers to consume our feed.
- **Socket limits:** inbound messages of at most 16 KB, and at most 20 per second per connection (beyond that, `rate_limited`), with at most 10 connections per IP.
- **REST limit:** 120 requests a minute per IP.
- **Keys:** provider keys exist only in the gateway's environment and never appear in responses or logs.

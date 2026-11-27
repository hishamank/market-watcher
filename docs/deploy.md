# Deploying the hosted demo

Only the owner deploys. Agents prepare the change and stop.

## Gateway (Fly.io)

From a clean checkout of the commit to ship, normally the head of `main`:

```bash
git status --short            # must print nothing
fly deploy --build-arg GATEWAY_REVISION="$(git rev-parse HEAD)"
```

Then check the result:

```bash
git rev-parse HEAD
curl -s https://hisham-stocks-gateway.fly.dev/health
fly logs | grep -E "gateway revision|chaos scope"
```

- `revision` in the health response equals the commit printed by `git rev-parse HEAD`. `unknown` means the build argument was left out.
- The log shows `chaos scope: connection`. The image and `fly.toml` both set it ([ADR 0072](adr/0072-chaos-scope-keeps-shared-controls-off-public-gateways.md)). On the hosted demo, open `/?debug=1`: the panel must offer only the controls for your own connection.
- During the deploy, an open tab reconnects by itself within a few seconds. The old machine gets `SIGTERM`, closes sockets with code 1001 and exits within 5 seconds ([ADR 0075](adr/0075-gateway-closes-on-signals-and-reports-its-revision.md)).

`fly.toml` holds every setting and no secret. The hosted gateway runs the simulator, so it needs no keys.

### Checking the proxy hop count

`TRUST_PROXY = "2"` assumes Fly adds two addresses to `X-Forwarded-For`: the client, then the app's own address. If the gateway moves to another host or behind a CDN, confirm it again: make one request, read `remoteAddress` for it in `fly logs`, and compare it with your public address. If they differ, every visitor shares one rate limit or a client can choose its own address.

## Web (Vercel)

Vercel builds `apps/web` from `main` with `NEXT_PUBLIC_GATEWAY_URL=https://hisham-stocks-gateway.fly.dev`. Deploy the gateway first when a change touches the socket contract: newer gateways stay compatible with the older web bundle, not always the reverse.

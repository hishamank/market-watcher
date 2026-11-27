# The gateway closes on signals and reports its revision

The gateway had cleanup hooks (the hub, the history cache, the feed) that only ran when a test called `app.close()`. A security review at `07a9bf3` found that `SIGTERM` and `SIGINT` killed the process outright: clients saw close code 1006, and nothing reported which commit a deployed gateway ran.

**Shutdown.** On `SIGTERM` or `SIGINT` the gateway closes every open socket with code 1001 (going away), then calls `app.close()`, which runs the existing hooks, and exits 0. A second signal joins the close already running. If the close has not finished after 5 seconds, the gateway exits 1. `fly.toml` sends `SIGTERM` and waits 10 seconds before killing, so the deadline always fires first. Clients already reconnect with backoff on any close, so no client change is needed.

**Revision.** The Docker build takes `--build-arg GATEWAY_REVISION=<commit>` and stores it in the image's environment. The gateway prints `gateway revision: <commit>` at startup and returns it as an optional `revision` field on `GET /health`. A value that is not 7 to 40 hexadecimal characters is reported as `unknown`, so the field can never echo arbitrary configuration. The steps to deploy and check are in [`docs/deploy.md`](../deploy.md).

**Configuration.** `PORT`, `ALLOWED_ORIGINS`, `TRUST_PROXY`, `REST_RATE_LIMIT_MAX` and `LOG_CLIENT_ADDRESSES` are now checked at startup, the way `FEED` and `CHAOS_SCOPE` already were. A bad value stops the gateway with one line naming the variable and the accepted forms; before, `PORT=abc` crashed with a stack trace and a mistyped origin silently refused every socket. Request logs leave out the client's address unless `LOG_CLIENT_ADDRESSES=true`, which exists for checking the proxy hop count after a deploy.

## Considered options

- **Close code 1012 (service restart):** closer in meaning, but 1001 is what browsers and proxies already expect from a server going away, and core treats every close the same.
- **A separate `/version` endpoint:** one more public route for one string. `/health` is already the link the README gives for the hosted gateway.
- **Read the commit with `git` at startup:** the image has no `.git` directory, and adding one would ship the history.
- **Log the revision only:** enough for the owner, but checking a deploy would need Fly access each time; the commit of a public repository is not sensitive.

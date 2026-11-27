# Chaos scope keeps shared controls off public gateways

Amends ADRs 0030 and 0040.

ADR 0030 let any connection in simulator mode turn on the four controls that affect everyone (`tick_spike`, `history_latency`, `history_failure_rate`, `force_closed`), and said the 60-second revert meant "a hosted demo cannot be left broken". A security review at `a4a1b7a` showed otherwise on a local copy of the hosted configuration. A client with no `Origin` header sent `force_closed` and `history_failure_rate: 100`; another visitor saw the market close and history return 503; and sending the control again restarted its 60 seconds, so one message a minute kept the demo broken. The Origin allowlist does not help, because it is not authentication (ADR 0028).

The gateway now has a chaos scope, set by `CHAOS_SCOPE`:

- **`global`** (the default, for local work, E2E and the verify skill): every chaos control works as before.
- **`connection`** (the Docker image's default, and set in `fly.toml`): `drop` and `freeze`, which touch only the sender, still work. Each of the four shared controls is answered with `invalid_message`, changes nothing and is not broadcast.

An unknown value stops the gateway at startup. Live mode is unchanged: no chaos state is sent and every `chaos` message is refused.

Clients learn the scope from `chaos_state`, which gains an optional `scope` field (`global` or `connection`). The gateway still sends `chaos_state` after `welcome` in simulator mode in both scopes. A frame without the field means `global`, so an older gateway keeps working with a newer app, and the protocol version stays at 1. Core reports it as `sharedControls` on `useChaosControls()`: true only once a `chaos_state` with global scope has arrived. The web panel and the mobile sheet use it to show the "Everyone" controls only when the gateway will honour them. Hiding them is presentation; the gateway is what refuses.

In global scope, a control that is already on keeps its original revert time when it is sent again, and a changed history failure rate takes effect without restarting the clock. So one activation lasts at most 60 seconds. Turning a control off and on again still starts a new 60 seconds, which is why global scope is for gateways where every client is trusted, and why the image defaults to `connection`.

## Considered options

- **A shared secret for chaos messages:** keeps the shared controls on the hosted demo for whoever holds the secret, but it is authentication for a debug panel, the secret would have to reach the browser, and a developer can see every shared control locally with one command.
- **Make the shared controls per connection:** they change simulator-wide state (the tick rate, the history source, the calendar), so this means a simulator per connection.
- **Keep them public with a cooldown:** a cooldown bounds the damage to part of each minute. Any visitor could still close the market for everyone.
- **Default to `connection` everywhere:** safest, but `pnpm dev`, the E2E launcher and the verify stack would each have to opt in, for no gain on a developer's machine. The image default covers the place it matters.
- **Carry the scope on `welcome`:** it also works, but core already stores `chaos_state` and the panel already reads it.

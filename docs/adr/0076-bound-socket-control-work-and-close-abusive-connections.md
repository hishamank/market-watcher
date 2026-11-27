# Bound socket control work and close abusive connections

Amends ADRs 0028 and 0066.

Conflation bounds what the gateway sends (ADR 0008). Nothing bounded what a connection could make the gateway hold or do. ADR 0066 said so: valid unsubscribes are always queued, with "no bound on the number of queued unsubscribe messages". A security review at `a4a1b7a` found three gaps on a local copy of the gateway:

- **Queued work:** while a subscribe waits for upstream data or a writable socket, every later subscribe and unsubscribe queues behind it, each holding up to 16 KB.
- **Waiters:** each over-limit subscribe on a blocked socket adds a waiter for its refusal.
- **No consequence:** a connection that ignores `rate_limited` is never closed. Ten connections from one address sent 48,000 frames of 15 KB in 8 seconds and every frame was parsed.

The gateway now applies three limits, all in memory and per process:

- **Pending operations, 256 per connection.** Queued subscribes and unsubscribes and waiting refusals share one count. A connection that would exceed it is removed from the hub and closed with 1008. A client paced at 20 messages a second that stalls for 10 seconds delivers at most 200 at once, which fits.
- **Over-limit messages, 300 in 10 seconds per connection.** Past that the connection is closed with 1008 and later frames are dropped without being parsed. The same 10-second stall produces at most 180 over-limit messages.
- **Cooldown, 30 seconds per address.** After an over-limit close, new handshakes from that address get 429 for 30 seconds. `/ws` upgrades are exempt from the REST limiter, so without this a client could reconnect and start again. The table holds at most 10,000 addresses; at the cap, expired entries are dropped and a new address is not recorded until there is room. Open connections from that address are left alone.

Valid unsubscribes below these limits are still always applied, in order (ADR 0066). Closing removes the member's watchers, releases its waiters and lets its queued tasks drain as no-ops, as any other close does. A subscribe that was still waiting on upstream data when its connection left does not wait for the socket to become writable afterwards, because nothing would ever wake it.

On a local image, the same flood with reconnects went from 48,424 frames parsed and no close to 3,386 frames, ten closes with 1008 and 9,330 refused handshakes. A paced client that subscribed to 100 symbols, churned 40 times and then sent a 180-message burst saw the same replies before and after and stayed connected. The half-second REST latency the review measured during the flood did not reproduce when measured again on the unfixed image (1 to 12 ms), so this ADR does not claim a latency improvement.

The numbers are chosen from the client's pacing, not measured capacity. Addresses behind one NAT share the cooldown: one abusive client costs its neighbours 30 seconds of reconnecting, and the apps already retry with backoff.

## Considered options

- **Check the rate before parsing:** cheapest per frame, but a subscribe needs its request ID to be refused and an unsubscribe must still be applied (ADRs 0038 and 0066), so the frame has to be read.
- **Close on the first over-limit message:** ADR 0066 rejected it; one burst after a network stall would make every visible price stale.
- **Throttle all `/ws` upgrades through the REST limiter:** also stops the reconnect loop, but honest reconnect storms after a deploy would be refused too.
- **Redis or a proxy-level limit:** right for several nodes (see the README's scaling section), not for one process.

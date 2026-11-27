# Feed changes require a new client session

Amends ADRs 0004 and 0041. Implements architecture finding A1 and issue #111.

A gateway's feed mode is fixed for its process lifetime, but a client can outlive that process. Reconnecting after a deployment must not label simulated data Live, or retain an older dataset because its timestamps happen to be newer.

One feed session belongs to each CoreProvider. The initial server shell identity, or the first validated REST response or socket welcome, establishes its mode. Validated supplemental responses use their existing source field: simulated means Simulated and Yahoo means Live. Hydrated query data is checked before it can seed quotes. A pure compatibility snapshot checks cached and pending hydration data together during rendering, including server rendering. Incompatible hydration never mounts the query hydration boundary; an effect then latches the terminal state. This avoids notifying ancestors during render while preventing a first-frame data leak.

A conflicting mode permanently quarantines that provider instance. The incompatible welcome cannot settle recovery or resubscribe. The socket closes, reconnect attempts stop, pending and future REST results are rejected, and both apps replace their market content with a reload-required screen. Web offers a full document reload. Expo asks the user to restart the app. Existing values are never presented as current while quarantined. A same-feed reconnect retains the existing recovery behavior.

The latch does not reset on Retry, network changes, background/foreground transitions or StrictMode effect cleanup. Only a new app session clears it. Query cancellation reduces wasted work; correctness comes from checking each response before returning it, including responses whose transport ignores cancellation. Query-cache synchronization also checks the latch before immediate and scheduled quote writes.

The public API adds useFeedSession(), returning reloadRequired, and the optional CoreProviderProps.initialFeedMode for server rendering. It does not change ConnectionStatus, wire Quote, quote precedence or per-symbol availability. Those remain separate reliability responsibilities.

## Alternatives

- Updating the badge alone would leave old quotes, history and in-flight requests mixed with the replacement feed.
- Resetting all stores and query caches in place would require coordinating every outstanding callback and SSR hydration with a new generation. A terminal state is smaller and safer for this change.

## Limits

The existing protocol identifies Simulated versus Live, not a provider revision or simulator seed. Switching datasets within the same mode is not detected. Introducing such an identity is separate work, not implied by this change.

The socket lifecycle file has a local max-lines exception to keep quarantine adjacent to reconnect and lifecycle behavior. It does not relax the repository-wide rule or introduce an unrelated refactor.

Browser tests replace the complete gateway through an E2E-only loopback control listener. Live-labelled fixtures use deterministic local sources for all endpoints; they prove identity and UI behavior, not connectivity to a real market provider. Existing Yahoo UI fixtures now run against that coherent fixture session. The control listener is never included in the production gateway.

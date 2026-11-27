# A total connection cap, and IPv6 budgets by /64

Amends ADR 0028.

ADR 0028 limits one address to 10 sockets and 120 REST requests a minute. A security review at `07a9bf3` noted two gaps: the gateway had no total cap, and both limits keyed on the full address, so a client with an IPv6 /64, the normal allocation for one home or phone, could use a different address for every connection.

**Budgets by /64.** The socket limit, the abuse cooldown (ADR 0076) and the REST limit now key on the first 64 bits of an IPv6 address. IPv4 and IPv4-mapped addresses key on the address, as before. People who share one /64, an office or a campus, share 10 sockets and 120 requests a minute, exactly as people behind one IPv4 NAT address already do. One tab uses one socket.

**Total cap.** The gateway holds at most 2,000 sockets and answers the next handshake with 503. `fly.toml` sets the Fly proxy's connection soft limit to 2,000 and hard limit to 2,500, so the gateway's own refusal is what a client normally meets.

The number comes from one local measurement, not from Fly: the image on one laptop core with 512 MB, every socket subscribed to the 50 default symbols in simulator mode.

| Sockets | Memory | CPU of one core | Frames per socket per second |
| ------- | ------ | --------------- | ---------------------------- |
| 500     | 130 MB | 17 to 25%       | 4.2                          |
| 1,000   | 149 MB | 31 to 43%       | 4.2                          |
| 2,000   | 170 MB | 43 to 61%       | 4.1                          |
| 3,000   | 206 MB | 45 to 57%       | 4.1                          |

So 2,000 leaves two thirds of the memory free and was served at the full conflated rate. A Fly shared CPU is slower than the core measured, and Live mode with distinct watched symbols costs more per socket, so treat 2,000 as a ceiling that stops unbounded growth, not as proven capacity. The scaling section of the README says what changes beyond one process.

## Considered options

- **Key IPv6 on the full address:** keeps honest users in one /64 apart, and makes both limits meaningless for anyone who controls a /64.
- **A larger socket budget for a /64 than for an IPv4 address:** some mobile carriers put one device per /64 and some campuses put thousands; without data either guess is arbitrary, so the two families get the same budget.
- **Only the Fly proxy limit:** no code, but the gateway would then depend on its host for a bound, and a refused client would see a proxy error instead of the gateway's 503.

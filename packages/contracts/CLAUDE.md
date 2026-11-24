# Contracts

The only source of wire types: Zod 4 schemas, the types inferred from them, and the money module.

- Socket messages are a union on `type`. The protocol version lives in the connect URL and `welcome`.
- Money is decimal strings, with arithmetic in integer units of 1/10,000 USD.
- Times are UTC epoch milliseconds.
- A breaking change bumps the protocol version and updates the gateway and core in the same PR.
- Zod is the only runtime dependency.

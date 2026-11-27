# Running, configuring and testing

Every price comes from the repository's own gateway, which runs a deterministic simulator by default and Alpaca as an opt-in live feed ([ADR 0003](adr/0003-split-live-feed-and-history-source.md)). Every environment variable is documented in [`.env.example`](../.env.example). The gateway reads only its process environment and does not load `.env` files by itself.

## Prerequisites and quick start

You need **Node 26** and **pnpm 10**. Node 26 no longer ships Corepack, so install pnpm once with `npm install -g pnpm@10`. It then switches itself to the version pinned in `package.json` ([ADR 0032](adr/0032-pinned-toolchain-and-one-command-start.md)).

```bash
pnpm i
pnpm dev
```

This starts the gateway in simulator mode at `http://localhost:4000` and the web app at `http://localhost:3000`. Open the web app: 50 stocks tick within a second or two. Append `?debug=1` to any page for simulator chaos controls and connection health metrics.

The simulator uses an always-open UTC-day calendar so the demo stays active at any hour; the **Simulated** badge makes that explicit.

## Custom ports

`pnpm dev` uses ports `4000` and `3000`. Running `PORT=… pnpm dev` fails because Turborepo hands the same `PORT` to both apps and the web app exits with `EADDRINUSE`. To run on other ports, start the two workspaces separately from the repository root:

```bash
ALLOWED_ORIGINS=http://localhost:3001 PORT=4001 pnpm --filter ./apps/gateway dev
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4001 PORT=3001 pnpm --filter ./apps/web dev
```

`ALLOWED_ORIGINS` must include the web app's origin. The default allowlist holds only `http://localhost:3000` and `http://localhost:3100`. With any other web origin the page still renders over SSR/REST, but the WebSocket upgrade is rejected and prices never tick.

## Mobile in Expo Go

The Expo Go app (`apps/mobile`) shares `packages/core` and `packages/tokens` with the web app. It requires no native build ([ADR 0033](adr/0033-expo-go-constraint-and-react-native-graph.md)).

Put the phone and development machine on the same Wi-Fi network, find the machine's LAN IP (`ipconfig getifaddr en0` on macOS, `hostname -I | awk '{print $1}'` on Linux), and start the gateway and Metro in separate terminals:

```bash
# Terminal 1: bind the gateway on all interfaces and allow the native socket origin
HOST=0.0.0.0 ALLOWED_ORIGINS=http://localhost:3000,http://<LAN IP>:4000 \
  pnpm --filter ./apps/gateway dev

# Terminal 2: start Expo with the gateway URL baked into the bundle
EXPO_PUBLIC_GATEWAY_URL=http://<LAN IP>:4000 pnpm --filter ./apps/mobile start
```

Scan the QR code with Expo Go for SDK 58.

- **Why not `pnpm dev`:** Turborepo does not pass `HOST` through to the gateway.
- **Why include the gateway's own origin:** React Native's WebSocket sends an `Origin` derived from the socket URL on both iOS and Android. Without that entry in `ALLOWED_ORIGINS`, prices load over REST and never tick ([ADR 0042](adr/0042-native-sockets-send-an-origin.md)).
- **Android emulator:** use `http://10.0.2.2:4000` for both `EXPO_PUBLIC_GATEWAY_URL` and the extra `ALLOWED_ORIGINS` entry, and keep `HOST=0.0.0.0` so IPv4 loopback reaches the gateway.
- **Changing the URL:** `EXPO_PUBLIC_GATEWAY_URL` is inlined when Metro bundles; restart Metro with `--clear` after changing it.
- **Troubleshooting:** [`.claude/skills/verify/mobile.md`](../.claude/skills/verify/mobile.md) includes a four-step doctor for diagnosing a phone that loads REST prices without live ticks.

## Live mode with Alpaca paper keys

Create a free Alpaca paper-trading account, then run the gateway with keys in its environment alongside the web app:

```bash
FEED=alpaca ALPACA_KEY_ID=<key id> ALPACA_SECRET_KEY=<secret> pnpm --filter ./apps/gateway start
pnpm --filter ./apps/web dev
```

The status badge switches to **Live**, connecting to Alpaca's paper-trading API and IEX stream by default (endpoint overrides are listed in [`.env.example`](../.env.example)). Outside 09:30–16:00 America/New_York time, the app shows **Market closed** with the last close. Missing or rejected keys stop the gateway at startup; it never falls back to the simulator ([ADR 0003](adr/0003-split-live-feed-and-history-source.md)). Alpaca keys are intentionally excluded from Turborepo's pass-through list, so `pnpm dev` cannot launch Live mode.

## Hosted demo deployment

The hosted web app runs on Vercel and connects to the hosted simulator gateway on Fly.io (`https://hisham-stocks-gateway.fly.dev/health`).

- **Gateway:** defined by [`Dockerfile.gateway`](../Dockerfile.gateway) and [`fly.toml`](../fly.toml), running in `FEED=simulator` mode (`SIM_SEED=demo-v1`) on one always-on machine in Frankfurt (`fra`) with `TRUST_PROXY=2`.
- **Web:** Vercel builds `apps/web` with `NEXT_PUBLIC_GATEWAY_URL=https://hisham-stocks-gateway.fly.dev`.
- **Origins:** `ALLOWED_ORIGINS` in [`fly.toml`](../fly.toml) includes the production Vercel origin and the gateway's own origin for Expo Go; additional preview domains require an explicit allowlist entry.

## Tests, static checks and verification

| Command | What it runs |
| --- | --- |
| `pnpm test` | Runs `check:adrs`, then Vitest across contracts, core (against an in-memory fake gateway), gateway (through real REST and WebSocket interfaces), web and mobile |
| `pnpm lint` | OxLint with custom no-comments rule, function/file size limits and the `useEffect` fence |
| `pnpm lint:fixtures` | Proves each custom lint rule still fails on a fixture that violates it |
| `pnpm format:check` | Oxfmt formatting check across the workspace |
| `pnpm typecheck` | TypeScript checks across all packages and the root project |
| `pnpm check:direction` | Rejects physical-direction Tailwind classes (`ml-`, `text-left`, etc.) in `apps/web` |
| `pnpm check:adrs` | Rejects duplicate ADR numbers or misnamed files in `docs/adr/` and reports the next free number |
| `pnpm build` | Production builds across workspaces |

### End-to-end Playwright suite

Install Playwright Chromium once:

```bash
pnpm --filter ./apps/web exec playwright install chromium
```

Run the suite against a production build with its own seed-42 gateway (default ports `4100` and `3100`):

```bash
pnpm --filter ./apps/web e2e
```

Override ports when another suite is already using `4100`/`3100`:

```bash
E2E_GATEWAY_PORT=4101 E2E_WEB_PORT=3101 pnpm --filter ./apps/web e2e
```

Each test title starts with its feature ID from [`docs/feature-map.md`](feature-map.md), so targeted runs work with:

```bash
pnpm --filter ./apps/web e2e --project chromium --grep "L2|D2"
```

Pass flags directly after `e2e` without a literal `--`; placing `--` before the flags causes Playwright to ignore `--grep` and run the whole suite.

### Verify skill

[`.claude/skills/verify/SKILL.md`](../.claude/skills/verify/SKILL.md) defines the repository's verification run. For application changes it runs targeted E2E tests, starts an isolated simulator stack (`bin/stack up`), runs scripted browser journeys (`bin/journey`) that capture screenshots, console logs, socket frames and storage state, and walks interactive criteria at phone and desktop widths. Documentation-only changes follow the skill's smaller static/link verification path. For measured results and caveats on the audited revision, see [`docs/verification.md`](verification.md).

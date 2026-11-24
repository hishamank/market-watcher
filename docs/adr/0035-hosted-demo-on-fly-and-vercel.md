# Hosted demo on Fly.io and Vercel

The gateway runs on Fly.io as one always-on machine, because WebSockets need a long-lived process, in the region chosen at deploy time. The web app runs on Vercel. Both run in simulator mode. The gateway's origin allowlist holds the Vercel domain, and the Expo app reads the gateway URL from an environment variable.

## Considered options

- **Serverless hosting for the gateway:** cannot hold long-lived socket connections or the in-memory hub and cache.

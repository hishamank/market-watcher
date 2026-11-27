# Web security headers and a nonce-based Content Security Policy

The web app sent no security headers of its own. A security review at `07a9bf3` read the hosted page's response: `strict-transport-security` from Vercel and `x-powered-by: Next.js`, and nothing else. It found no XSS sink, so this is defence in depth: a later mistake or a compromised front-end dependency should not be able to load script from anywhere or send data anywhere.

**Headers on every response** (`next.config.ts`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera, microphone, geolocation and payment, and no `X-Powered-By`.

**A Content Security Policy on every page** (`src/proxy.ts`), built per request with a fresh nonce, the way Next.js documents it:

| Directive                          | Value                                                | Why                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src`                       | `'self' 'nonce-…' 'strict-dynamic'`                  | Next.js puts the nonce on its own scripts. The theme script gets it from the layout. No `unsafe-inline`, and `unsafe-eval` only in development. |
| `style-src`                        | `'self' 'unsafe-inline'`                             | Server-rendered `style` attributes position the virtual list and the chart. Inline style cannot run code.                                       |
| `connect-src`                      | `'self'` and the gateway's `http(s)` and `ws(s)` origins | Everything else the app talks to is itself.                                                                                                     |
| `img-src`                          | `'self' data: blob: https:`                          | Live-mode news thumbnails come from whichever publisher the feed names.                                                                         |
| `frame-ancestors`, `object-src`    | `'none'`                                             | Nothing frames the app and it embeds no plugins.                                                                                                |
| `base-uri`, `form-action`          | `'self'`                                             |                                                                                                                                                 |

Every page was already rendered per request (the layout reads the gateway and the locale cookie), which a nonce requires.

Zod probes for `eval` once by calling `new Function("")`, and under this policy the browser reports each probe as a violation even though Zod catches it and carries on. Contracts now tells Zod to skip its compiled parsers when it loads in a browser, so the policy reports nothing in normal use. The gateway and React Native keep the compiled parsers.

Checked on the production build with both themes and both languages, on the list, the watchlist view, the debug panel and a detail page with two ranges: the socket connected, the chart drew, and there were no policy violations and no console errors.

## Considered options

- **A static policy in `next.config.ts` with `unsafe-inline` for scripts:** no proxy and no per-request work, but it allows exactly the injected inline script a policy exists to stop.
- **Hash-based policy with Subresource Integrity:** keeps static rendering, but Next.js marks it experimental and these pages are dynamic anyway.
- **Nonces for styles too:** the stricter choice, but React writes `style` attributes during server rendering, which a nonce cannot cover.
- **`upgrade-insecure-requests`:** left out, because it would rewrite the local gateway's `http://localhost` address; Vercel already sends HSTS.
- **Report-only first:** sensible for a product with real traffic. Here the full E2E suite, which fails on any console error, is the check.

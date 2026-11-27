# 0061. Route metadata describes stocks without live prices

Date: 2026-11-27

## Decision

Use Next.js server metadata for page titles, descriptions, canonical URLs, Open Graph and Twitter cards. Stock pages share a request-cached gateway lookup with server prefetch. Core exports its existing `createI18n` factory for server translation. Metadata uses the shared English and Arabic catalogues; a language switch refreshes the server tree without replacing the client providers.

Titles identify the symbol and company. Descriptions explain that prices may be simulated. Prices and timestamps stay out of metadata because search results and shared links outlive a quote. A gateway failure returns a symbol-only title with noindex. Unknown stocks keep the existing not-found response.

`SITE_URL` defines the canonical origin and defaults to the existing hosted demo. Range, watchlist and debug query parameters do not create separate indexed pages. Locale remains cookie-based, so there are no distinct language URLs to advertise with hreflang.

Production builds allow indexing; Vercel previews and development pages emit noindex. Robots allows crawling so crawlers can read that directive. Only indexable builds advertise a sitemap. The sitemap includes the homepage and the gateway's initial stock list; the rest of the catalogue is discoverable through page links. A gateway failure fails the sitemap request rather than publishing an incomplete successful response.

The app icon uses the existing upward-chart motif. No dependency or provider API is added.

## Consequences

Set `SITE_URL` when moving the public deployment. Self-hosted staging must set `VERCEL_ENV=preview` to suppress indexing. Metadata follows language switches through a server refresh; browser tests check that connection state remains intact. This does not introduce language-specific search landing pages or claim search ranking improvements.

# Tailwind on web, StyleSheet on mobile, both fed by tokens

Web uses Tailwind v4, with `packages/tokens` turned into its theme variables. Only logical utilities (`ms-`, `pe-`, `start-` and so on) are allowed, and a CI check fails the build on physical ones (`ml-`, `pr-`, `left-`, `text-left` and so on), which is how right-to-left readiness is enforced on web. Mobile uses React Native's `StyleSheet` with the same tokens and start and end style properties.

## Considered options

- **NativeWind on mobile:** shared class names would buy nothing, since the two apps have separate views, and it adds a build layer to Metro.

# An explicit colour scheme on web

The web header now offers an eclipse switch: the sun retracts its rays and a moving SVG mask cuts out a crescent. Hover reveals a short orbit; reduced motion switches directly to the final state. It uses the existing palette and motion tokens, with no new dependency.

Web follows the operating system until the user chooses light or dark. That choice is stored as `color-scheme:v1`, survives navigation and reload, and synchronises across tabs. Invalid or unavailable storage falls back to the system; when storage is blocked, a choice still works for the current page session. Clearing the stored preference restores system behaviour.

A small head script applies the saved preference before first paint. Generated theme CSS also retains a system fallback without JavaScript. The DOM and storage stay in the web platform adapter, passed through `CoreProvider`; the core hook exposes the selected scheme and toggle. Both the header and the canvas chart subscribe to that same adapter, so axes, previous-close line and series change together with the page. Expo keeps its existing system-driven palette.

A CSS-only icon switch would leave the canvas chart on the old palette. A theme library would add a dependency for one preference and two browser event subscriptions. Neither is needed here.

This user-requested switch adds `useColorScheme` and an optional `colorScheme` adapter to the frozen core API (ADR 0020). Existing consumers need no changes; the export contract test includes the new hook.

# Core

All client logic, running unchanged on web and React Native.

- Imports come from React, TanStack Query, i18next and contracts. Storage, network status and lifecycle are interfaces injected through `CoreProvider`.
- Stores are created inside `CoreProvider`, once per instance.
- The quote store notifies per symbol, and the newest timestamp wins.
- The public API is `index.ts`. After the freeze, changes need the owner's sign-off.
- Strings go through `useT()`, and events through `track()` from hooks.
- Tests run in plain Node against the in-memory fake gateway.

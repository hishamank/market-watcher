# Pinned toolchain and a one-command start

Node 26 LTS is pinned in `.nvmrc` and `engines`, and pnpm through the `packageManager` field with Corepack, so every machine and agent worktree builds with the same tools. `pnpm i && pnpm dev` starts the gateway in simulator mode and the web app through Turborepo, and the Expo app joins once it exists. `.env.example` documents every variable, and the simulator needs none.

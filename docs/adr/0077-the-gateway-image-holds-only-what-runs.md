# The gateway image holds only what runs

Amends ADR 0035.

The first `Dockerfile.gateway` was one stage: it installed pnpm globally, installed every dependency of the gateway and contracts including development ones, and started the gateway through `tsx`. A security review at `07a9bf3` scanned that image: 41 high or critical findings in operating-system packages, 31 in Node packages and 15 in the Go-built TypeScript compiler. Every Node finding was in pnpm or the npm that ships with the base image, none in code the gateway loads.

The image is now built in two stages from a base pinned by digest:

- **Dependencies stage:** installs pnpm and runs `pnpm install --frozen-lockfile --prod` for the gateway and contracts.
- **Runtime stage:** applies the distribution's pending package updates, removes npm, npx, Corepack and Yarn, and copies in the production `node_modules`, the two `package.json` files and the sources. It still runs as the `node` user.

The gateway starts with `node apps/gateway/src/main.ts`. Node 26 strips types itself, and the repository already compiles with `erasableSyntaxOnly` and `verbatimModuleSyntax` and imports with `.ts` extensions, so no loader is needed. `tsx` stays a development dependency for `pnpm dev` and the tests. A test starts `main.ts` under plain `node` so a construct Node cannot strip fails in the suite, not in the image.

Measured on the rebuilt image: 454 MB against 745 MB, no pnpm, npm or compiler, no high or critical finding in Node packages, and 35 in operating-system packages, none of which has a fixed version in Debian 12 at the time of writing. Startup, `/health`, all ten REST routes, the socket, the chaos scope and signal handling were checked against it on a local network.

The digest pin makes the base reproducible; the `apt-get upgrade` in the runtime stage does not, on purpose, so a rebuild picks up fixes. Moving the pin is a manual step when Node 26 publishes a new patch image.

## Considered options

- **Keep `tsx` and move it to `dependencies`:** the smallest change, but it keeps esbuild and a second TypeScript implementation in the image for something Node already does.
- **Compile to JavaScript in the build stage:** the usual answer, but the repository has no emit step (ADR 0032) and `noEmit` is set; adding one is a build pipeline for a single process.
- **A distroless base:** fewer operating-system packages, but no shell for Fly's console and one more image to track; worth revisiting if the operating-system findings ever matter.

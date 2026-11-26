# Exact versions and a seven-day release age

Every dependency and dev dependency is pinned to an exact version, with no `^` or `~`. `saveExact` in `pnpm-workspace.yaml` keeps `pnpm add` from writing a range back. The Expo packages were on `~` ranges; they are now pinned at the versions already in the lockfile, so nothing installed changes. A later Expo bump edits the pins by hand or through `expo install`. Peer dependencies in `packages/core` keep their `^` ranges, because a peer range states compatibility and the apps' own pins decide what is installed.

`minimumReleaseAge: 10080` makes pnpm refuse to resolve any version published less than seven days ago. Most malicious releases are found and pulled within hours or days, so a week-old version has had time to be reported. The cost is that a fix released today waits a week. `minimumReleaseAgeExclude` lets one exact version through when we cannot wait, and the exception should be deleted once that version is a week old.

The check runs only when pnpm resolves: `pnpm add`, `pnpm update`, or an install after a `package.json` change. An install against an up-to-date lockfile, and CI's `--frozen-lockfile`, skip resolution, so versions already locked keep installing. When the rule was added, some locked versions were younger than a week: i18next 27.2.9, the oxlint 1.95.0 and oxfmt 0.80.0 platform binaries, and terser 5.51.4. We left them without exceptions, so `pnpm add` fails until about 2 December 2026, when the last of them, i18next, is a week old.

Pinning without the age rule still lets a fresh `pnpm add` pick up a release published minutes ago. The age rule without pins still lets a lockfile refresh move every range at once. Together they make each version change deliberate and at least a week old.

# Unattended agents work in worktrees, open PRs and never merge

Agents run unattended, and the owner reviews and merges between runs.

- **Isolation:** each ticket runs as a delegated task in its own git worktree, on a branch named `t/<issue>-<slug>`. The agent opens a PR, as a draft if verify fails, and never merges.
- **Models:** only the owner's allowlist (Claude Opus at high effort, Fable, Gemini Neon, Codex Sol or Astra). Implementers alternate between Opus and Codex Sol, and each PR is reviewed by the other model family before the owner sees it.
- **Permissions:** full access inside the agent's own worktree, with a committed deny list: no pushes to `main`, no force pushes, no `gh pr merge`, no reading `.env*` files.
- **Availability:** unattended windows run under `systemd-inhibit`, so the machine does not sleep. Usage is checked per ticket. A provider that runs low pauses its lane and never falls back to a model outside the allowlist.
- **Blocked agents:** an agent that hits a blocker comments on its issue (what blocks it, what it tried), labels it `blocked`, pushes its work as a draft PR, and moves on to the next unblocked ticket in its lane. It never waits for a human.
- **History:** Conventional Commits, small, each one type-checking. PR descriptions include the verify output, and Co-Authored-By trailers record AI authorship.

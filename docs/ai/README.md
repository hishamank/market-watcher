# Working with AI

This guide is the entry point for repeating the workflow. The [build account](../../README.md#how-it-was-built-with-ai) describes the original work; the prompts below are reconstructed reusable templates, added after the build. They are not verbatim session transcripts or proof that a particular instruction was used historically.

## Setup

1. Follow the [root README](../../README.md#quick-start-no-keys) for Node, pnpm and dependency installation. Use the pinned toolchain and `pnpm install --frozen-lockfile`.
2. Open the checkout in your agent tool. Read the root [CLAUDE.md](../../CLAUDE.md) and the instructions in each affected workspace. `AGENTS.md` is a relative symlink to `CLAUDE.md` at each level; both names share one source. If your tool does not load either automatically, explicitly attach those files.
3. For Claude Code, the repository supplies [settings](../../.claude/settings.json) and the [verify skill](../../.claude/skills/verify/SKILL.md). Settings enable the external `frontend-design@claude-plugins-official` plugin; its implementation is not vendored. Install that plugin in your Claude environment when using it for design work. The plain-text prompts and verification scripts do not require it.
4. For Codex or Gemini, attach the selected prompt file or ask the agent to read its repository path, then supply the inputs listed at the top. Claude can use the same approach. These Markdown prompts are not registered slash commands. Claude's `/verify` invokes the existing skill; other agents should read and follow that skill explicitly.
5. Verification needs Playwright Chromium (`pnpm --filter ./apps/web exec playwright install chromium`). Its stack helpers need Linux with Bash, `setsid`, `ss`, `pkill` and `curl`. The skill documents separate mobile and live-feed prerequisites. Reserve distinct ports when multiple worktrees run; never stop another checkout's processes.

The [shared guardrails](../../CLAUDE.md#guardrails) apply to every agent. Claude's deny entries are tool-specific restrictions, not a cross-provider security boundary. Worktrees isolate files and branches; they do not sandbox credentials or the host. Keep live credentials outside agent-readable files and use the simulator for ordinary development.

## Sequence

| Stage | Input | Artifact and completion criterion |
| --- | --- | --- |
| [Plan](prompts/plan.md) | Brief, constraints, owner decisions | Agreed scope, unresolved decisions and acceptance criteria; owner confirms consequential choices |
| [Implement a ticket](prompts/implement-ticket.md) | Issue, base, allowed scope, feature IDs | Scoped branch and PR with checks and verification evidence |
| [Independent review](prompts/review.md) | Base/head SHAs, ticket, review scope | Reproduced or source-supported findings, coverage limits and verdict |
| [Fix review findings](prompts/fix-review.md) | Findings and reviewed SHA | Disposition of each finding, targeted fixes and fresh evidence |
| Verify and hand back | Final code and affected feature IDs | [Verification report](../../.claude/skills/verify/SKILL.md#6-report), accessible evidence and owner merge |

Use a separate review context, preferably a different model family when available. The owner or orchestrator supplies the model and effort; the templates do not silently select a replacement. Delegation must be explicitly authorized. The agent never merges.

Example invocation after filling the placeholders:

```text
Read docs/ai/prompts/implement-ticket.md and follow it.
Issue: <URL or complete ticket text>
Base: <branch and commit SHA>
Allowed scope: <workspaces and behavior>
Feature IDs: <IDs from docs/feature-map.md>
Dependencies: <merged prerequisites or parent branch>
Constraints: <extra boundaries, or none>
```

## Historical example

The [README's review account](../../README.md#what-cross-family-review-caught) links [PR #27](https://github.com/hishamank/stocks-watchlist/pull/27), [PR #28](https://github.com/hishamank/stocks-watchlist/pull/28) and the fix in [PR #31](https://github.com/hishamank/stocks-watchlist/pull/31). It reports that matching subscribe replies by arrival order failed under rate limiting, backpressure and asynchronous upstream work. [ADR 0038](../adr/0038-subscribe-replies-carry-a-request-id.md) records the resulting request-ID decision.

This is a navigation aid to existing evidence, not a reconstructed transcript or a new reproduction. The useful loop is a concrete finding, an explicit design decision, a scoped fix and verification. For new work, retain the actual task prompt and a sanitized finding/fix summary in the PR when useful; link evidence a reviewer can access rather than only local filenames.

# Working with AI

Start with a ticket that states the behavior, constraints and acceptance criteria. Use the shared rules and skills below to turn it into a change another teammate can review and maintain. The same workflow works without the owner's orchestration tools or model configuration.

## Start here

1. Follow the [quick start](../../README.md#quick-start-no-keys). Read root [CLAUDE.md](../../CLAUDE.md) and affected workspace instructions. `AGENTS.md` shares those instructions through relative symlinks.
2. Skills live in `.claude/skills/`, with relative aliases in `.agents/skills/`. Use `/grill-with-docs`, `/code-review`, `/pr` and `/verify` where your harness exposes them. Otherwise ask the agent to read the corresponding `SKILL.md` directly; this also works for Gemini. Preserve symlinks when cloning.
3. Claude's [settings](../../.claude/settings.json) enable the external `frontend-design@claude-plugins-official` plugin for design work. It is not needed for the bundled planning, review, PR or verification workflows. Claude-specific deny entries supplement the [shared guardrails](../../CLAUDE.md#guardrails); they are not a cross-provider security boundary.
4. For application verification, follow the [verify prerequisites](../../.claude/skills/verify/SKILL.md#2-launch). Browser journeys need Playwright Chromium and Linux tools (`setsid`, `ss`, `pkill`, `curl`). Mobile and live feeds have separate prerequisites. Documentation-only work follows the skill's smaller check path.

## Make a change

| Stage | What a teammate does | Result |
| --- | --- | --- |
| Plan | Use [grill-with-docs](../../.claude/skills/grill-with-docs/SKILL.md) for unresolved design choices | Agreed scope, terms and decisions; owner resolves consequential choices |
| Implement | Give the agent the issue, base revision, dependencies and allowed scope | A focused branch meeting the ticket's acceptance criteria |
| Verify | Follow [verify](../../.claude/skills/verify/SKILL.md) for the actual diff | Observed results with commands, tested revision and accessible evidence |
| Open a PR | Use [pr](../../.claude/skills/pr/SKILL.md) | Summary, evidence and change risks; draft status follows verify |
| Review | Use [code-review](../../.claude/skills/code-review/SKILL.md) for standards and spec coverage; use the [bug-review brief](prompts/review.md) for behavioral defects | Separate standards/spec findings or reproduction-backed bug findings, with coverage limits |
| Resolve and hand back | Assess findings, fix accepted defects, rerun affected checks and request re-review | Updated evidence and disposition of each finding; owner merges |

Use a fresh review context, preferably a different model family when available. The owner or orchestrator supplies model and effort per assignment ([ADR 0067](../adr/0067-model-selection-per-assignment.md)). Invoking code-review requests its two review agents; explicit session restrictions take precedence.

## A real ticket as the prompt

[Issue #30](https://github.com/hishamank/stocks-watchlist/issues/30) specifies request IDs, dependencies, frozen interfaces and observable acceptance criteria. [PR #31](https://github.com/hishamank/stocks-watchlist/pull/31) changes the contracts; [PR #28](https://github.com/hishamank/stocks-watchlist/pull/28) implements the gateway side and [PR #27](https://github.com/hishamank/stocks-watchlist/pull/27) implements core recovery and records the real-core/real-gateway probe.

That is the reusable pattern: the ticket supplies the task context; shared rules supply constraints; the PR carries the evidence and the decisions a reviewer needs. Use those artifacts as examples when writing the next ticket, rather than depending on an undocumented personal prompt.

[Sources and adaptations](SOURCES.md) record provenance and how to maintain the bundled skills.

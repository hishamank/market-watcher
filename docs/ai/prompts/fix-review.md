# Resolve review findings

Reconstructed reusable template, added after the original build.

Inputs: findings, reviewed head SHA, current branch, ticket scope, and reviewer evidence.

1. Read the shared and workspace instructions, each finding and its evidence. Compare the reviewed SHA with the current branch so already-fixed findings and intervening changes are accounted for.
2. Reproduce each reported scenario where feasible. Classify it as accepted, already fixed, disputed with evidence, or blocked. A review claim alone is not proof; lack of reproduction alone does not disprove it.
3. Fix accepted findings within the ticket's scope and architecture. Preserve both sides of stacked changes. Add a targeted regression test when it protects a critical behavior; avoid tests that only mirror implementation.
4. Rerun the relevant repros and required checks. Follow `.claude/skills/verify/SKILL.md` for affected features. Refresh the PR description and evidence for the new head; keep required FAIL or BLOCKED work in draft status.
5. Supply the new SHA, diff summary and per-finding disposition for independent re-review. Request or launch a reviewer only when authorized; do not self-report an independent approval.

Hand back the PR URL, head SHA, disposition of every finding, commands and observed results, remaining blockers, and accessible verification evidence. Only the owner merges.

# Implement one ticket

Reconstructed reusable template, added after the original build.

Inputs: issue URL or text, base branch and SHA, allowed scope, feature IDs, dependencies, and additional constraints.

1. Read the ticket, root and affected workspace instructions, relevant ADRs and `docs/feature-map.md`. Confirm the supplied base and dependency state against the checkout. If access or a required input is missing, identify the blocker before dependent work.
2. Work on the assigned branch in the assigned worktree. Preserve existing edits. For stacked work, use the specified parent branch and target it in the PR. Delegation and extra worktrees require explicit authorization.
3. Implement the smallest change that meets acceptance criteria. Keep wire contracts, core logic and platform integrations within their documented boundaries. Follow shared guardrails; ask before dependencies or changes to the frozen core API.
4. Run the repository's required type, lint, format and test checks, plus applicable build, lint-fixture and direction checks. Use the package scripts as the source of truth. Read and follow `.claude/skills/verify/SKILL.md` for the supplied and additionally affected feature IDs, including its smoke set.
5. Review the diff for unintended scope and secrets. Commit coherent changes, push the working branch and open a PR against the specified base. Required FAIL or BLOCKED checks mean a draft PR; report what is needed to finish. A failed or unavailable check is never a pass.

Hand back the PR URL, head SHA, changes, exact checks and results, verify table with accessible evidence, and remaining blockers. Only the owner merges. If blocked, preserve useful work, report the blocker on the assigned issue when authorized, and stop; take another ticket only when the assignment authorizes a queue.

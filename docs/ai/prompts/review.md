# Review behavioral correctness

Use this brief for bug-hunting review alongside the standards/spec `code-review` skill. Inputs: ticket, base and head revisions, review scope and testing restrictions.

1. Read shared and workspace instructions, acceptance criteria, relevant ADRs and the diff. Resolve and record both revisions and their merge-base. Inspect affected callers and state transitions.
2. Independently look for concrete failures in contracts, lifecycle, error handling and user-visible behavior. Treat author claims as hypotheses to check, not evidence.
3. Reproduce suspected defects with a targeted check when permitted. Compare with the base to distinguish regressions from pre-existing defects. Label source-only conclusions, blocked checks and checks not run explicitly.
4. Keep the review read-only: no edits, commits, pushes or merges. Put permitted disposable repros outside the repository. Do not launch additional agents unless authorized.
5. Report each actionable finding with severity, exact file/line, trigger, impact and reproduction status. Separate optional suggestions from defects; do not invent findings to fill a quota.
6. Finish with reviewed revisions, checks actually run and their counts, coverage limits, and APPROVE or CHANGES REQUIRED for concrete defects. If required evidence is unavailable, say approval is withheld pending that evidence.

For fix rounds, focus on the named findings and their regressions unless scope is expanded. Approval is a review conclusion; only the owner merges.
